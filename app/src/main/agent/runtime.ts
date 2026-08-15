import { join } from 'path'
import { app } from 'electron'
import {
  createAgentSession,
  ModelRuntime,
  SessionManager,
  type AgentSession,
  type AgentSessionEvent
} from '@earendil-works/pi-coding-agent'
import type {
  ChatStreamEvent,
  ChatSummary,
  ChatModelInfo,
  ChatMessageSnapshot,
  ProviderStatus
} from '../../preload'

// Chat mode targets Google's Gemini as its first real (non-stub) provider —
// see docs/ARCHITECTURE.md §4. Google/Mistral are built into pi-ai's catalog,
// so no custom provider registration is needed here.
const GOOGLE_MODEL_ID = 'gemini-flash-latest'

// Providers Astheno's Settings UI knows how to collect a key for. Adding a
// provider here (once it's wired into a session the way Google is) is the
// only step needed to get it a Settings row — status/save/clear are generic.
const KNOWN_PROVIDERS: { id: string; name: string }[] = [{ id: 'google', name: 'Google (Gemini)' }]

function getAgentHomeDir(): string {
  return join(app.getPath('userData'), 'agent')
}

let modelRuntimePromise: Promise<ModelRuntime> | null = null

function getModelRuntime(): Promise<ModelRuntime> {
  if (!modelRuntimePromise) {
    const homeDir = getAgentHomeDir()
    modelRuntimePromise = ModelRuntime.create({
      authPath: join(homeDir, 'auth.json'),
      modelsPath: join(homeDir, 'models.json')
    })
  }
  return modelRuntimePromise
}

interface ChatEntry {
  session: AgentSession
  assistantTurn: number
}

const chats = new Map<string, ChatEntry>()
// Session id -> jsonl path, populated by listChats() so openChat() can resume
// a chat that isn't already live in `chats` (e.g. after an app restart).
const sessionPaths = new Map<string, string>()

export async function listModels(): Promise<ChatModelInfo[]> {
  const modelRuntime = await getModelRuntime()
  return modelRuntime.getModels('google').map((model) => ({ id: model.id, name: model.name }))
}

export async function listChats(): Promise<ChatSummary[]> {
  const infos = await SessionManager.list(getAgentHomeDir())
  return infos
    .filter((info) => info.messageCount > 0)
    .map((info) => {
      sessionPaths.set(info.id, info.path)
      return {
        chatId: info.id,
        title: info.firstMessage || 'New chat',
        updatedAt: info.modified.getTime()
      }
    })
}

export async function createChat(modelId?: string): Promise<{ chatId: string; modelId: string }> {
  const modelRuntime = await getModelRuntime()
  const model = modelRuntime.getModel('google', modelId ?? GOOGLE_MODEL_ID)
  if (!model) {
    throw new Error(
      `Model google/${modelId ?? GOOGLE_MODEL_ID} not found — check GEMINI_API_KEY in app/.env.local`
    )
  }

  // Chat mode never gets tools — that boundary is deliberate, see
  // docs/ARCHITECTURE.md §3. Cowork mode is the only place tools/connectors
  // get wired up.
  //
  // No explicit thinkingLevel: Pi clamps its own default per model's
  // capabilities, and that self-selection is more reliable across the
  // catalog than any single fixed value — different Gemini entries accept
  // different thinking levels (confirmed: forcing 'off' broke
  // gemini-flash-latest with a "MINIMAL not supported" error from Google).
  const { session } = await createAgentSession({
    cwd: getAgentHomeDir(),
    modelRuntime,
    model,
    noTools: 'all',
    sessionManager: SessionManager.create(getAgentHomeDir())
  })

  chats.set(session.sessionId, { session, assistantTurn: 0 })
  return { chatId: session.sessionId, modelId: model.id }
}

/**
 * Resume a chat for continued prompting, loading it from disk if it isn't
 * already live in this process (e.g. after an app restart). Deliberately
 * omits `model` when resuming from disk so Pi restores whatever model that
 * session last used, rather than forcing it back to the default.
 */
export async function openChat(
  chatId: string
): Promise<{ chatId: string; messages: ChatMessageSnapshot[]; modelId: string }> {
  let entry = chats.get(chatId)

  if (!entry) {
    const path = sessionPaths.get(chatId)
    if (!path) throw new Error(`Unknown chat ${chatId}`)

    const modelRuntime = await getModelRuntime()
    const { session } = await createAgentSession({
      cwd: getAgentHomeDir(),
      modelRuntime,
      noTools: 'all',
      sessionManager: SessionManager.open(path)
    })

    entry = { session, assistantTurn: 0 }
    chats.set(chatId, entry)
  }

  return {
    chatId,
    messages: toMessageSnapshots(chatId, entry.session.messages),
    modelId: entry.session.model?.id ?? GOOGLE_MODEL_ID
  }
}

function toMessageSnapshots(chatId: string, messages: AgentSession['messages']): ChatMessageSnapshot[] {
  const snapshots: ChatMessageSnapshot[] = []
  let index = 0

  for (const message of messages) {
    if (message.role === 'user') {
      snapshots.push({
        id: `${chatId}:hist:${index++}`,
        role: 'user',
        content:
          typeof message.content === 'string'
            ? message.content
            : message.content.map((c) => (c.type === 'text' ? c.text : '')).join(''),
        createdAt: message.timestamp
      })
    } else if (message.role === 'assistant') {
      snapshots.push({
        id: `${chatId}:hist:${index++}`,
        role: 'assistant',
        content: message.content.map((c) => (c.type === 'text' ? c.text : '')).join(''),
        createdAt: message.timestamp
      })
    }
  }

  return snapshots
}

/**
 * Translates Pi's raw AgentSessionEvent stream into the small ChatStreamEvent
 * wire protocol the renderer understands. Pi's event union carries a lot of
 * session/extension-internal detail Chat mode has no use for.
 */
export function subscribeChat(chatId: string, emit: (event: ChatStreamEvent) => void): () => void {
  const entry = chats.get(chatId)
  if (!entry) throw new Error(`Unknown chat ${chatId}`)

  let currentMessageId: string | null = null

  return entry.session.subscribe((event: AgentSessionEvent) => {
    if (event.type === 'message_start' && event.message.role === 'assistant') {
      entry.assistantTurn += 1
      currentMessageId = `${chatId}:${entry.assistantTurn}`
      emit({ type: 'assistant_start', chatId, messageId: currentMessageId })
      return
    }

    if (!currentMessageId) return

    if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
      emit({
        type: 'assistant_delta',
        chatId,
        messageId: currentMessageId,
        delta: event.assistantMessageEvent.delta
      })
      return
    }

    if (event.type === 'message_update' && event.assistantMessageEvent.type === 'error') {
      emit({
        type: 'error',
        chatId,
        messageId: currentMessageId,
        message: extractErrorMessage(event.assistantMessageEvent.error.errorMessage)
      })
      return
    }

    // A request can fail before any message_update ever fires (e.g. a 404 on
    // an unavailable model) — the assistant message goes straight from
    // message_start to message_end with stopReason "error". Catch that case
    // here too, or the failure is silent: an empty bubble, isSending clears,
    // nothing visibly wrong.
    if (event.type === 'message_end' && event.message.role === 'assistant') {
      if (event.message.stopReason === 'error') {
        emit({
          type: 'error',
          chatId,
          messageId: currentMessageId,
          message: extractErrorMessage(event.message.errorMessage)
        })
      } else {
        emit({ type: 'assistant_done', chatId, messageId: currentMessageId })
      }
      currentMessageId = null
    }
  })
}

/**
 * Provider errors often arrive as JSON-stringified, sometimes doubly nested
 * (pi-ai's wrapper around the raw provider error body). Best-effort unwrap
 * to the innermost human-readable message; falls back to the raw string.
 */
function extractErrorMessage(raw: string | undefined): string {
  if (!raw) return 'Model request failed'
  let current = raw
  for (let i = 0; i < 3; i++) {
    try {
      const parsed = JSON.parse(current)
      const nested = parsed?.error?.message
      if (typeof nested === 'string' && nested !== current) {
        current = nested
        continue
      }
    } catch {
      break
    }
    break
  }
  return current
}

export async function promptChat(chatId: string, text: string): Promise<void> {
  const entry = chats.get(chatId)
  if (!entry) throw new Error(`Unknown chat ${chatId}`)
  await entry.session.prompt(text)
}

export async function abortChat(chatId: string): Promise<void> {
  const entry = chats.get(chatId)
  if (!entry) return
  await entry.session.abort()
}

export async function setChatModel(chatId: string, modelId: string): Promise<void> {
  const entry = chats.get(chatId)
  if (!entry) throw new Error(`Unknown chat ${chatId}`)
  const modelRuntime = await getModelRuntime()
  const model = modelRuntime.getModel('google', modelId)
  if (!model) throw new Error(`Model google/${modelId} not found`)
  await entry.session.setModel(model)
}

export async function getProviderStatus(): Promise<ProviderStatus[]> {
  const modelRuntime = await getModelRuntime()
  // listCredentials() reflects only stored credentials — what this screen
  // actually manages. hasConfiguredAuth() would also report "configured"
  // from an ambient env var (e.g. dev's GEMINI_API_KEY in .env.local),
  // which would make "Remove" look broken: still "Connected" after removing
  // a key that was never actually stored.
  const stored = await modelRuntime.listCredentials()
  const storedIds = new Set(stored.map((c) => c.providerId))
  return KNOWN_PROVIDERS.map((provider) => ({
    ...provider,
    configured: storedIds.has(provider.id)
  }))
}

/**
 * Persists an API key via Pi's own credential store (auth.json at the
 * authPath ModelRuntime was created with) — the same mechanism `pi login`
 * uses, and the same file ModelRuntime already resolves auth from at
 * request time. `login`'s AuthInteraction is designed for an interactive
 * CLI prompt loop; here it's a one-shot fake that just hands back the key
 * the Settings UI already collected.
 */
export async function setProviderApiKey(providerId: string, apiKey: string): Promise<void> {
  const modelRuntime = await getModelRuntime()
  await modelRuntime.login(providerId, 'api_key', {
    async prompt() {
      return apiKey
    },
    notify() {}
  })
}

export async function clearProviderApiKey(providerId: string): Promise<void> {
  const modelRuntime = await getModelRuntime()
  await modelRuntime.logout(providerId)
}

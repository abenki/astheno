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
  CoworkStreamEvent,
  CoworkSessionSummary,
  CoworkMessageSnapshot,
  CoworkToolCallSnapshot,
  ProviderStatus
} from '../../preload'

// The 7 built-in Pi tools Cowork sessions get — see docs/ARCHITECTURE.md §3.
// Chat mode stays tool-less (noTools: 'all'); Cowork is the only mode that
// gets these.
const COWORK_TOOLS = ['read', 'bash', 'edit', 'write', 'grep', 'find', 'ls']

// Chat mode targets Google's Gemini as its first real (non-stub) provider —
// see docs/ARCHITECTURE.md §4. Google/Mistral are built into pi-ai's catalog,
// so no custom provider registration is needed here.
const GOOGLE_MODEL_ID = 'gemini-flash-latest'

// Auto-titling wants the cheapest, highest-free-tier-throughput model in the
// catalog, not the chat's own model — it's a one-off summarization call, not
// part of the conversation. Google's "flash-lite" tier is the one it grants
// the highest free-plan requests-per-minute/per-day to (it's also, not
// coincidentally, the cheapest per-token tier — see the cost table in
// providers/data/google.json). "-latest" alias for the same reason
// GOOGLE_MODEL_ID uses it: stays correct as Google's catalog moves under it.
const TITLE_MODEL_ID = 'gemini-flash-lite-latest'

// Providers Astheno's Settings UI knows how to collect a key for. Adding a
// provider here (once it's wired into a session the way Google is) is the
// only step needed to get it a Settings row — status/save/clear are generic.
const KNOWN_PROVIDERS: { id: string; name: string }[] = [{ id: 'google', name: 'Google (Gemini)' }]

function getAgentHomeDir(): string {
  return join(app.getPath('userData'), 'agent')
}

// Default location offered by the Cowork "New task" folder picker — not a
// fixed cwd every session shares. See docs/ARCHITECTURE.md §6 and the
// plan's "each session pinned to one picked folder" decision.
function getCoworkWorkspaceDir(): string {
  return join(app.getPath('userData'), 'workspace')
}

// Where Cowork session jsonl files physically live — shared across every
// Cowork session regardless of which folder that session's cwd points at.
// Deliberately separate from getAgentHomeDir()'s default session dir so
// listChats() never surfaces a Cowork session or vice versa.
function getCoworkSessionDir(): string {
  return join(getAgentHomeDir(), 'cowork-sessions')
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

// Separate registries mirroring the two above, but for Cowork sessions —
// kept apart from `chats`/`sessionPaths` rather than a shared map with a
// mode tag, matching the storage-pool split (see getCoworkSessionDir()).
const coworkSessions = new Map<string, ChatEntry>()
const coworkSessionPaths = new Map<string, string>()

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
        title: info.name || info.firstMessage || 'New chat',
        updatedAt: info.modified.getTime()
      }
    })
}

/**
 * Get (or lazily resume from disk) the live session entry for a chat. Shared
 * by openChat, renameChat, and generateChatTitle so renaming/titling works
 * even for a chat the renderer never opened this run (e.g. renamed straight
 * from the sidebar hover menu without entering it).
 */
async function ensureChatEntry(chatId: string): Promise<ChatEntry> {
  const existing = chats.get(chatId)
  if (existing) return existing

  const path = sessionPaths.get(chatId)
  if (!path) throw new Error(`Unknown chat ${chatId}`)

  const modelRuntime = await getModelRuntime()
  const { session } = await createAgentSession({
    cwd: getAgentHomeDir(),
    modelRuntime,
    noTools: 'all',
    sessionManager: SessionManager.open(path)
  })

  const entry: ChatEntry = { session, assistantTurn: 0 }
  chats.set(chatId, entry)
  return entry
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
  const entry = await ensureChatEntry(chatId)
  return {
    chatId,
    messages: toMessageSnapshots(chatId, entry.session.messages),
    modelId: entry.session.model?.id ?? GOOGLE_MODEL_ID
  }
}

export async function renameChat(chatId: string, title: string): Promise<void> {
  const trimmed = title.trim()
  if (!trimmed) throw new Error('Title cannot be empty')
  const entry = await ensureChatEntry(chatId)
  entry.session.sessionManager.appendSessionInfo(trimmed)
}

function cleanGeneratedTitle(raw: string): string {
  const trimmed = raw
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '')
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed
}

/**
 * Summarizes a chat's first message into a short title using TITLE_MODEL_ID,
 * via a throwaway in-memory session — never persisted, never touches the
 * real chat's history, so the summarization prompt doesn't pollute the
 * conversation the user is actually having. Persists the result onto the
 * real chat the same way renameChat does, so it survives restarts and shows
 * up in listChats() like a manual rename would.
 */
export async function generateChatTitle(chatId: string, firstMessage: string): Promise<string> {
  const modelRuntime = await getModelRuntime()
  const model = modelRuntime.getModel('google', TITLE_MODEL_ID)
  if (!model) throw new Error(`Model google/${TITLE_MODEL_ID} not found`)

  const { session: scratchSession } = await createAgentSession({
    cwd: getAgentHomeDir(),
    modelRuntime,
    model,
    noTools: 'all',
    sessionManager: SessionManager.inMemory(getAgentHomeDir())
  })

  await scratchSession.prompt(
    'Summarize the following chat message into a short conversation title ' +
      '(3-6 words, no quotes, no trailing punctuation). Reply with only the title.\n\n' +
      `Message:\n${firstMessage}`
  )

  const reply = [...scratchSession.messages].reverse().find((m) => m.role === 'assistant')
  const text = reply ? reply.content.map((c) => (c.type === 'text' ? c.text : '')).join('') : ''

  const title = cleanGeneratedTitle(text)
  if (!title) throw new Error('Model returned an empty title')

  const entry = await ensureChatEntry(chatId)
  entry.session.sessionManager.appendSessionInfo(title)

  return title
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

export async function listCoworkSessions(): Promise<CoworkSessionSummary[]> {
  // Not SessionManager.list(cwd, sessionDir): that overload exact-matches
  // each session's stored header cwd against `cwd`, which would filter out
  // almost every Cowork session since each one has a different real folder.
  // listAll(sessionDir) lists everything under the given sessionDir with no
  // cwd filtering at all — the correct call for a mixed-cwd storage pool.
  const infos = await SessionManager.listAll(getCoworkSessionDir())
  return infos
    .filter((info) => info.messageCount > 0)
    .map((info) => {
      coworkSessionPaths.set(info.id, info.path)
      return {
        chatId: info.id,
        title: info.name || info.firstMessage || 'New task',
        updatedAt: info.modified.getTime(),
        cwd: info.cwd
      }
    })
}

/**
 * Mirrors ensureChatEntry. Deliberately omits the top-level `cwd` option on
 * resume so createAgentSession falls back to `sessionManager.getCwd()`,
 * which SessionManager.open() derives from the session's own stored header
 * — restoring the exact folder this session was created against, the same
 * way ensureChatEntry omits `model` to let Pi restore that too. This only
 * works because createCoworkSession (below) stores the real picked folder
 * as the session's header cwd, not a shared constant.
 */
async function ensureCoworkEntry(chatId: string): Promise<ChatEntry> {
  const existing = coworkSessions.get(chatId)
  if (existing) return existing

  const path = coworkSessionPaths.get(chatId)
  if (!path) throw new Error(`Unknown cowork session ${chatId}`)

  const modelRuntime = await getModelRuntime()
  const { session } = await createAgentSession({
    modelRuntime,
    tools: COWORK_TOOLS,
    sessionManager: SessionManager.open(path)
  })

  const entry: ChatEntry = { session, assistantTurn: 0 }
  coworkSessions.set(chatId, entry)
  return entry
}

export async function createCoworkSession(
  cwd: string,
  modelId?: string
): Promise<{ chatId: string; modelId: string }> {
  const modelRuntime = await getModelRuntime()
  const model = modelRuntime.getModel('google', modelId ?? GOOGLE_MODEL_ID)
  if (!model) {
    throw new Error(
      `Model google/${modelId ?? GOOGLE_MODEL_ID} not found — check GEMINI_API_KEY in app/.env.local`
    )
  }

  // `cwd` is used as both the tools' working directory and the session's
  // stored header cwd (via the SessionManager.create(cwd, ...) below) —
  // these must be the same value, or folder-grouping and tool-cwd
  // restoration on resume both silently break.
  const { session } = await createAgentSession({
    cwd,
    modelRuntime,
    model,
    tools: COWORK_TOOLS,
    sessionManager: SessionManager.create(cwd, getCoworkSessionDir())
  })

  coworkSessions.set(session.sessionId, { session, assistantTurn: 0 })
  return { chatId: session.sessionId, modelId: model.id }
}

export async function openCoworkSession(
  chatId: string
): Promise<{ chatId: string; messages: CoworkMessageSnapshot[]; modelId: string; cwd: string }> {
  const entry = await ensureCoworkEntry(chatId)
  return {
    chatId,
    messages: toCoworkMessageSnapshots(chatId, entry.session.messages),
    modelId: entry.session.model?.id ?? GOOGLE_MODEL_ID,
    cwd: entry.session.sessionManager.getCwd()
  }
}

export async function renameCoworkSession(chatId: string, title: string): Promise<void> {
  const trimmed = title.trim()
  if (!trimmed) throw new Error('Title cannot be empty')
  const entry = await ensureCoworkEntry(chatId)
  entry.session.sessionManager.appendSessionInfo(trimmed)
}

function summarizeToolResult(result: unknown): string {
  const content = (result as { content?: unknown } | undefined)?.content
  if (!Array.isArray(content)) return ''
  return content
    .map((block) =>
      block && typeof block === 'object' && (block as { type?: string }).type === 'text'
        ? (block as { text: string }).text
        : ''
    )
    .join('')
}

function toCoworkMessageSnapshots(
  chatId: string,
  messages: AgentSession['messages']
): CoworkMessageSnapshot[] {
  const snapshots: CoworkMessageSnapshot[] = []
  const toolCallsById = new Map<string, CoworkToolCallSnapshot>()
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
      const toolCalls: CoworkToolCallSnapshot[] = []
      for (const block of message.content) {
        if (block.type === 'toolCall') {
          const snapshot: CoworkToolCallSnapshot = {
            toolCallId: block.id,
            toolName: block.name,
            args: block.arguments
          }
          toolCalls.push(snapshot)
          toolCallsById.set(block.id, snapshot)
        }
      }
      snapshots.push({
        id: `${chatId}:hist:${index++}`,
        role: 'assistant',
        content: message.content.map((c) => (c.type === 'text' ? c.text : '')).join(''),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        createdAt: message.timestamp
      })
    } else if (message.role === 'toolResult') {
      const snapshot = toolCallsById.get(message.toolCallId)
      if (snapshot) {
        snapshot.result = message.content.map((c) => (c.type === 'text' ? c.text : '')).join('')
        snapshot.isError = message.isError
      }
    }
  }

  return snapshots
}

/**
 * Mirrors subscribeChat's translation loop, plus branches for the
 * tool-execution events Chat never sees (Chat sessions have no tools, so
 * these never fire there). tool_execution_start/end are top-level
 * AgentEvent variants, not nested under assistantMessageEvent like text
 * deltas are.
 */
export function subscribeCowork(chatId: string, emit: (event: CoworkStreamEvent) => void): () => void {
  const entry = coworkSessions.get(chatId)
  if (!entry) throw new Error(`Unknown cowork session ${chatId}`)

  let currentMessageId: string | null = null

  return entry.session.subscribe((event: AgentSessionEvent) => {
    // A tool-calling turn is: message_start/message_end (assistant, requests
    // the call) -> tool_execution_start/end -> another message_start/end
    // (the follow-up, either another tool call or the final text) -> ...
    // The first message_end already fires with stopReason "toolUse" *before*
    // the tool actually runs — treating that as "done" (like Chat does,
    // where it's always safe since Chat never calls tools) would clear
    // currentMessageId right before tool_execution_start/end arrive, so
    // those events land in a dead zone with nothing to attach to and get
    // silently dropped. Instead, keep one messageId open across the whole
    // round trip: only allocate a new one when nothing is currently open,
    // and only close it out on a genuine stop (not "toolUse").
    if (event.type === 'message_start' && event.message.role === 'assistant') {
      if (currentMessageId) return
      entry.assistantTurn += 1
      currentMessageId = `${chatId}:${entry.assistantTurn}`
      emit({ type: 'assistant_start', chatId, messageId: currentMessageId })
      return
    }

    if (event.type === 'tool_execution_start') {
      emit({
        type: 'tool_start',
        chatId,
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        args: event.args
      })
      return
    }

    if (event.type === 'tool_execution_end') {
      emit({
        type: 'tool_end',
        chatId,
        toolCallId: event.toolCallId,
        isError: event.isError,
        result: summarizeToolResult(event.result)
      })
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

    if (event.type === 'message_end' && event.message.role === 'assistant') {
      if (event.message.stopReason === 'error') {
        emit({
          type: 'error',
          chatId,
          messageId: currentMessageId,
          message: extractErrorMessage(event.message.errorMessage)
        })
        currentMessageId = null
      } else if (event.message.stopReason !== 'toolUse') {
        emit({ type: 'assistant_done', chatId, messageId: currentMessageId })
        currentMessageId = null
      }
      // stopReason "toolUse": leave currentMessageId open — the upcoming
      // tool_execution_start/end and the follow-up message_start/delta/end
      // continue under this same messageId.
    }
  })
}

export async function promptCowork(chatId: string, text: string): Promise<void> {
  const entry = coworkSessions.get(chatId)
  if (!entry) throw new Error(`Unknown cowork session ${chatId}`)
  await entry.session.prompt(text)
}

export async function abortCowork(chatId: string): Promise<void> {
  const entry = coworkSessions.get(chatId)
  if (!entry) return
  await entry.session.abort()
}

export async function setCoworkModel(chatId: string, modelId: string): Promise<void> {
  const entry = coworkSessions.get(chatId)
  if (!entry) throw new Error(`Unknown cowork session ${chatId}`)
  const modelRuntime = await getModelRuntime()
  const model = modelRuntime.getModel('google', modelId)
  if (!model) throw new Error(`Model google/${modelId} not found`)
  await entry.session.setModel(model)
}

export function getCoworkDefaultFolder(): string {
  return getCoworkWorkspaceDir()
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

import { useEffect, useRef, useState } from 'react'
import { CoworkSession, Message, ModelOption, ToolCall } from './types'

const DEFAULT_MODEL_ID = 'gemini-flash-latest'

function titleFromText(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed
}

export interface CoworkState {
  sessions: CoworkSession[]
  activeSession: CoworkSession | null
  activeSessionId: string | null
  isSending: boolean
  models: ModelOption[]
  modelId: string | null
  selectSession: (id: string | null) => void
  newSession: () => void
  send: (text: string) => void
  setModel: (modelId: string) => void
  renameSession: (id: string, title: string) => void
}

export function useCowork(): CoworkState {
  const [sessions, setSessions] = useState<CoworkSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [models, setModels] = useState<ModelOption[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  // Pi doesn't assign message ids; messageId (from main) -> local Message.id.
  // Only assistant_start/delta/done/error carry a messageId.
  const pendingMessageIds = useRef(new Map<string, string>())
  // tool_start/tool_end carry no messageId at all — they belong to whichever
  // assistant message is currently open for that chat, tracked separately.
  const currentMessageIdByChat = useRef(new Map<string, string>())

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null
  const modelId = activeSession?.modelId ?? selectedModelId

  function appendMessage(chatId: string, message: Message): void {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === chatId
          ? { ...s, messages: [...s.messages, message], updatedAt: message.createdAt }
          : s
      )
    )
  }

  function updateMessageContent(
    chatId: string,
    localMessageId: string,
    updater: (content: string) => string
  ): void {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === chatId
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === localMessageId ? { ...m, content: updater(m.content) } : m
              )
            }
          : s
      )
    )
  }

  function appendToolCall(chatId: string, localMessageId: string, toolCall: ToolCall): void {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === chatId
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === localMessageId
                  ? { ...m, toolCalls: [...(m.toolCalls ?? []), toolCall] }
                  : m
              )
            }
          : s
      )
    )
  }

  function updateToolCall(
    chatId: string,
    localMessageId: string,
    toolCallId: string,
    patch: Partial<ToolCall>
  ): void {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === chatId
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === localMessageId
                  ? {
                      ...m,
                      toolCalls: (m.toolCalls ?? []).map((tc) =>
                        tc.toolCallId === toolCallId ? { ...tc, ...patch } : tc
                      )
                    }
                  : m
              )
            }
          : s
      )
    )
  }

  useEffect(() => {
    window.api.cowork.listModels().then((fetched) => {
      setModels(fetched)
      setSelectedModelId((current) => {
        if (current) return current
        return fetched.some((m) => m.id === DEFAULT_MODEL_ID) ? DEFAULT_MODEL_ID : (fetched[0]?.id ?? null)
      })
    })

    window.api.cowork.list().then((summaries) => {
      setSessions(
        summaries
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((s) => ({
            id: s.chatId,
            title: titleFromText(s.title),
            cwd: s.cwd,
            messages: [],
            updatedAt: s.updatedAt
          }))
      )
    })
  }, [])

  useEffect(() => {
    return window.api.cowork.onEvent((event) => {
      if (event.type === 'assistant_start') {
        const localId = crypto.randomUUID()
        pendingMessageIds.current.set(event.messageId ?? '', localId)
        currentMessageIdByChat.current.set(event.chatId, localId)
        appendMessage(event.chatId, {
          id: localId,
          role: 'assistant',
          content: '',
          createdAt: Date.now()
        })
        return
      }

      if (event.type === 'tool_start') {
        const localId = currentMessageIdByChat.current.get(event.chatId)
        if (!localId || !event.toolCallId || !event.toolName) return
        appendToolCall(event.chatId, localId, {
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          args: event.args,
          pending: true
        })
        return
      }

      if (event.type === 'tool_end') {
        const localId = currentMessageIdByChat.current.get(event.chatId)
        if (!localId || !event.toolCallId) return
        updateToolCall(event.chatId, localId, event.toolCallId, {
          result: event.result,
          isError: event.isError,
          pending: false
        })
        return
      }

      const localId = event.messageId ? pendingMessageIds.current.get(event.messageId) : undefined
      if (!localId) return

      if (event.type === 'assistant_delta') {
        updateMessageContent(event.chatId, localId, (content) => content + (event.delta ?? ''))
        return
      }

      if (event.type === 'assistant_done') {
        pendingMessageIds.current.delete(event.messageId ?? '')
        currentMessageIdByChat.current.delete(event.chatId)
        setIsSending(false)
        return
      }

      if (event.type === 'error') {
        updateMessageContent(event.chatId, localId, (content) => `${content}\n\n(error: ${event.message})`)
        pendingMessageIds.current.delete(event.messageId ?? '')
        currentMessageIdByChat.current.delete(event.chatId)
        setIsSending(false)
      }
    })
  }, [])

  async function selectSession(id: string | null): Promise<void> {
    setActiveSessionId(id)
    if (!id) return

    const target = sessions.find((s) => s.id === id)
    if (!target || target.hydrated) return

    const opened = await window.api.cowork.open(id)
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              messages: opened.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                toolCalls: m.toolCalls,
                createdAt: m.createdAt
              })),
              modelId: opened.modelId,
              cwd: opened.cwd,
              hydrated: true
            }
          : s
      )
    )
  }

  // Shared by newSession() and send()'s lazy-create path — both need the
  // same "ask for a folder, then create a session against it" sequence.
  async function pickFolderAndCreate(): Promise<{ id: string; cwd: string; modelId: string } | null> {
    const cwd = await window.api.cowork.pickFolder()
    if (!cwd) return null
    const created = await window.api.cowork.createSession(cwd, selectedModelId ?? undefined)
    return { id: created.chatId, cwd, modelId: created.modelId }
  }

  async function newSession(): Promise<void> {
    const created = await pickFolderAndCreate()
    if (!created) return
    const session: CoworkSession = {
      id: created.id,
      title: 'New task',
      cwd: created.cwd,
      messages: [],
      updatedAt: Date.now(),
      modelId: created.modelId,
      hydrated: true
    }
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(created.id)
  }

  async function send(text: string): Promise<void> {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: Date.now()
    }

    let sessionId = activeSession?.id

    if (!sessionId) {
      const created = await pickFolderAndCreate()
      if (!created) return
      sessionId = created.id
      const session: CoworkSession = {
        id: sessionId,
        title: titleFromText(text),
        cwd: created.cwd,
        messages: [userMessage],
        updatedAt: userMessage.createdAt,
        modelId: created.modelId,
        hydrated: true
      }
      setSessions((prev) => [session, ...prev])
      setActiveSessionId(sessionId)
    } else {
      appendMessage(sessionId, userMessage)
    }

    setIsSending(true)
    await window.api.cowork.prompt(sessionId, text)
  }

  async function renameSession(id: string, title: string): Promise<void> {
    const trimmed = title.trim()
    if (!trimmed) return
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: trimmed } : s)))
    try {
      await window.api.cowork.rename(id, trimmed)
    } catch (err) {
      console.error('[cowork] rename failed', err)
    }
  }

  function setModel(nextModelId: string): void {
    setSelectedModelId(nextModelId)
    if (activeSession) {
      void window.api.cowork.setModel(activeSession.id, nextModelId)
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSession.id ? { ...s, modelId: nextModelId } : s))
      )
    }
  }

  return {
    sessions,
    activeSession,
    activeSessionId,
    isSending,
    models,
    modelId,
    selectSession: (id: string | null) => {
      void selectSession(id)
    },
    newSession: () => {
      void newSession()
    },
    send: (text: string) => {
      void send(text)
    },
    setModel,
    renameSession: (id: string, title: string) => {
      void renameSession(id, title)
    }
  }
}

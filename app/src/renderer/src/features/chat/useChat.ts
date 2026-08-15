import { useEffect, useRef, useState } from 'react'
import { Chat, Message, ModelOption } from './types'

const DEFAULT_MODEL_ID = 'gemini-flash-latest'

function titleFromText(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed
}

export interface ChatState {
  chats: Chat[]
  activeChat: Chat | null
  activeChatId: string | null
  isSending: boolean
  models: ModelOption[]
  modelId: string | null
  selectChat: (id: string | null) => void
  newChat: () => void
  send: (text: string) => void
  setModel: (modelId: string) => void
}

export function useChat(): ChatState {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [models, setModels] = useState<ModelOption[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  // Pi doesn't assign message ids; messageId (from main) -> local Message.id
  const pendingMessageIds = useRef(new Map<string, string>())

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null
  const modelId = activeChat?.modelId ?? selectedModelId

  function appendMessage(chatId: string, message: Message): void {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, message], updatedAt: message.createdAt }
          : c
      )
    )
  }

  function updateMessageContent(
    chatId: string,
    localMessageId: string,
    updater: (content: string) => string
  ): void {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === localMessageId ? { ...m, content: updater(m.content) } : m
              )
            }
          : c
      )
    )
  }

  useEffect(() => {
    window.api.chat.listModels().then((fetched) => {
      setModels(fetched)
      setSelectedModelId((current) => {
        if (current) return current
        return fetched.some((m) => m.id === DEFAULT_MODEL_ID) ? DEFAULT_MODEL_ID : (fetched[0]?.id ?? null)
      })
    })

    window.api.chat.list().then((summaries) => {
      setChats(
        summaries
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((s) => ({ id: s.chatId, title: titleFromText(s.title), messages: [], updatedAt: s.updatedAt }))
      )
    })
  }, [])

  useEffect(() => {
    return window.api.chat.onEvent((event) => {
      if (event.type === 'assistant_start') {
        const localId = crypto.randomUUID()
        pendingMessageIds.current.set(event.messageId, localId)
        appendMessage(event.chatId, {
          id: localId,
          role: 'assistant',
          content: '',
          createdAt: Date.now()
        })
        return
      }

      const localId = pendingMessageIds.current.get(event.messageId)
      if (!localId) return

      if (event.type === 'assistant_delta') {
        updateMessageContent(event.chatId, localId, (content) => content + (event.delta ?? ''))
        return
      }

      if (event.type === 'assistant_done') {
        pendingMessageIds.current.delete(event.messageId)
        setIsSending(false)
        return
      }

      if (event.type === 'error') {
        updateMessageContent(event.chatId, localId, (content) => `${content}\n\n(error: ${event.message})`)
        pendingMessageIds.current.delete(event.messageId)
        setIsSending(false)
      }
    })
  }, [])

  async function selectChat(id: string | null): Promise<void> {
    setActiveChatId(id)
    if (!id) return

    const target = chats.find((c) => c.id === id)
    if (!target || target.hydrated) return

    const opened = await window.api.chat.open(id)
    setChats((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              messages: opened.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: m.createdAt
              })),
              modelId: opened.modelId,
              hydrated: true
            }
          : c
      )
    )
  }

  async function send(text: string): Promise<void> {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: Date.now()
    }

    setIsSending(true)

    let chatId = activeChat?.id
    if (!chatId) {
      const created = await window.api.chat.createChat(selectedModelId ?? undefined)
      chatId = created.chatId
      const newChat: Chat = {
        id: chatId,
        title: titleFromText(text),
        messages: [userMessage],
        updatedAt: userMessage.createdAt,
        modelId: created.modelId,
        hydrated: true
      }
      setChats((prev) => [newChat, ...prev])
      setActiveChatId(chatId)
    } else {
      appendMessage(chatId, userMessage)
    }

    await window.api.chat.prompt(chatId, text)
  }

  function setModel(nextModelId: string): void {
    setSelectedModelId(nextModelId)
    if (activeChat) {
      void window.api.chat.setModel(activeChat.id, nextModelId)
      setChats((prev) => prev.map((c) => (c.id === activeChat.id ? { ...c, modelId: nextModelId } : c)))
    }
  }

  return {
    chats,
    activeChat,
    activeChatId,
    isSending,
    models,
    modelId,
    selectChat: (id: string | null) => {
      void selectChat(id)
    },
    newChat: () => setActiveChatId(null),
    send: (text: string) => {
      void send(text)
    },
    setModel
  }
}

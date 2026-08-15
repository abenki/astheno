import { useState } from 'react'
import { seedChats } from './mockData'
import { Chat, Message } from './types'

function titleFromText(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed
}

function stubReply(text: string): string {
  return `(stub reply — no model connected yet) I heard: "${text}"`
}

export interface ChatState {
  chats: Chat[]
  activeChat: Chat | null
  activeChatId: string | null
  isSending: boolean
  selectChat: (id: string | null) => void
  newChat: () => void
  send: (text: string) => void
}

export function useChat(): ChatState {
  const [chats, setChats] = useState<Chat[]>(() => seedChats())
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null

  function appendMessage(chatId: string, message: Message): void {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, message], updatedAt: message.createdAt }
          : c
      )
    )
  }

  function replyTo(chatId: string, userText: string): void {
    setIsSending(true)
    setTimeout(
      () => {
        appendMessage(chatId, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: stubReply(userText),
          createdAt: Date.now()
        })
        setIsSending(false)
      },
      700 + Math.random() * 600
    )
  }

  function send(text: string): void {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: Date.now()
    }

    if (activeChat) {
      appendMessage(activeChat.id, userMessage)
      replyTo(activeChat.id, text)
      return
    }

    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: titleFromText(text),
      messages: [userMessage],
      updatedAt: userMessage.createdAt
    }
    setChats((prev) => [newChat, ...prev])
    setActiveChatId(newChat.id)
    replyTo(newChat.id, text)
  }

  return {
    chats,
    activeChat,
    activeChatId,
    isSending,
    selectChat: setActiveChatId,
    newChat: () => setActiveChatId(null),
    send
  }
}

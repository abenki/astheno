export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: number
}

export interface Chat {
  id: string
  title: string
  messages: Message[]
  updatedAt: number
  modelId?: string
  hydrated?: boolean
}

export interface ModelOption {
  id: string
  name: string
}

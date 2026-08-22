export type MessageRole = 'user' | 'assistant'

export interface ToolCall {
  toolCallId: string
  toolName: string
  args: unknown
  result?: string
  isError?: boolean
  pending?: boolean
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  toolCalls?: ToolCall[]
  createdAt: number
}

export interface CoworkSession {
  id: string
  title: string
  cwd: string
  messages: Message[]
  updatedAt: number
  modelId?: string
  hydrated?: boolean
}

export interface ModelOption {
  id: string
  name: string
}

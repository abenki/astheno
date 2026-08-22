import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export interface ChatStreamEvent {
  type: 'assistant_start' | 'assistant_delta' | 'assistant_done' | 'error'
  chatId: string
  messageId: string
  delta?: string
  message?: string
}

export interface ChatSummary {
  chatId: string
  title: string
  updatedAt: number
}

export interface ChatModelInfo {
  id: string
  name: string
}

export interface ChatMessageSnapshot {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

export interface AsthenoChatApi {
  list: () => Promise<ChatSummary[]>
  open: (
    chatId: string
  ) => Promise<{ chatId: string; messages: ChatMessageSnapshot[]; modelId: string }>
  createChat: (modelId?: string) => Promise<{ chatId: string; modelId: string }>
  prompt: (chatId: string, text: string) => Promise<void>
  abort: (chatId: string) => Promise<void>
  listModels: () => Promise<ChatModelInfo[]>
  setModel: (chatId: string, modelId: string) => Promise<void>
  rename: (chatId: string, title: string) => Promise<void>
  generateTitle: (chatId: string, firstMessage: string) => Promise<{ title: string }>
  onEvent: (callback: (event: ChatStreamEvent) => void) => () => void
}

export interface CoworkStreamEvent {
  type: 'assistant_start' | 'assistant_delta' | 'assistant_done' | 'tool_start' | 'tool_end' | 'error'
  chatId: string
  messageId?: string
  delta?: string
  message?: string
  toolCallId?: string
  toolName?: string
  args?: unknown
  result?: string
  isError?: boolean
}

export interface CoworkToolCallSnapshot {
  toolCallId: string
  toolName: string
  args: unknown
  result?: string
  isError?: boolean
}

export interface CoworkMessageSnapshot {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: CoworkToolCallSnapshot[]
  createdAt: number
}

export interface CoworkSessionSummary {
  chatId: string
  title: string
  updatedAt: number
  cwd: string
}

export interface AsthenoCoworkApi {
  list: () => Promise<CoworkSessionSummary[]>
  open: (
    chatId: string
  ) => Promise<{ chatId: string; messages: CoworkMessageSnapshot[]; modelId: string; cwd: string }>
  pickFolder: () => Promise<string | null>
  createSession: (cwd: string, modelId?: string) => Promise<{ chatId: string; modelId: string }>
  prompt: (chatId: string, text: string) => Promise<void>
  abort: (chatId: string) => Promise<void>
  listModels: () => Promise<ChatModelInfo[]>
  setModel: (chatId: string, modelId: string) => Promise<void>
  rename: (chatId: string, title: string) => Promise<void>
  onEvent: (callback: (event: CoworkStreamEvent) => void) => () => void
}

export interface ProviderStatus {
  id: string
  name: string
  configured: boolean
}

export interface AsthenoSettingsApi {
  getProviderStatus: () => Promise<ProviderStatus[]>
  setApiKey: (providerId: string, apiKey: string) => Promise<void>
  clearApiKey: (providerId: string) => Promise<void>
}

export interface AsthenoApi {
  chat: AsthenoChatApi
  cowork: AsthenoCoworkApi
  settings: AsthenoSettingsApi
}

const chat: AsthenoChatApi = {
  list: () => ipcRenderer.invoke('astheno:chat:list'),
  open: (chatId) => ipcRenderer.invoke('astheno:chat:open', chatId),
  createChat: (modelId) => ipcRenderer.invoke('astheno:chat:create', modelId),
  prompt: (chatId, text) => ipcRenderer.invoke('astheno:chat:prompt', chatId, text),
  abort: (chatId) => ipcRenderer.invoke('astheno:chat:abort', chatId),
  listModels: () => ipcRenderer.invoke('astheno:chat:listModels'),
  setModel: (chatId, modelId) => ipcRenderer.invoke('astheno:chat:setModel', chatId, modelId),
  rename: (chatId, title) => ipcRenderer.invoke('astheno:chat:rename', chatId, title),
  generateTitle: (chatId, firstMessage) =>
    ipcRenderer.invoke('astheno:chat:generateTitle', chatId, firstMessage),
  onEvent: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ChatStreamEvent): void => callback(payload)
    ipcRenderer.on('astheno:chat:event', listener)
    return () => ipcRenderer.removeListener('astheno:chat:event', listener)
  }
}

const cowork: AsthenoCoworkApi = {
  list: () => ipcRenderer.invoke('astheno:cowork:list'),
  open: (chatId) => ipcRenderer.invoke('astheno:cowork:open', chatId),
  pickFolder: () => ipcRenderer.invoke('astheno:cowork:pickFolder'),
  createSession: (cwd, modelId) => ipcRenderer.invoke('astheno:cowork:create', cwd, modelId),
  prompt: (chatId, text) => ipcRenderer.invoke('astheno:cowork:prompt', chatId, text),
  abort: (chatId) => ipcRenderer.invoke('astheno:cowork:abort', chatId),
  listModels: () => ipcRenderer.invoke('astheno:cowork:listModels'),
  setModel: (chatId, modelId) => ipcRenderer.invoke('astheno:cowork:setModel', chatId, modelId),
  rename: (chatId, title) => ipcRenderer.invoke('astheno:cowork:rename', chatId, title),
  onEvent: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: CoworkStreamEvent): void => callback(payload)
    ipcRenderer.on('astheno:cowork:event', listener)
    return () => ipcRenderer.removeListener('astheno:cowork:event', listener)
  }
}

const settings: AsthenoSettingsApi = {
  getProviderStatus: () => ipcRenderer.invoke('astheno:settings:getProviderStatus'),
  setApiKey: (providerId, apiKey) => ipcRenderer.invoke('astheno:settings:setApiKey', providerId, apiKey),
  clearApiKey: (providerId) => ipcRenderer.invoke('astheno:settings:clearApiKey', providerId)
}

const api: AsthenoApi = { chat, cowork, settings }

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

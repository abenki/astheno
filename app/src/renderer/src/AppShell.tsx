import { useState } from 'react'
import { AppMode, Sidebar } from './components/Sidebar'
import { TopIcons } from './components/TopIcons'
import { ChatHistoryList } from './features/chat/ChatHistoryList'
import { EmptyState } from './features/chat/EmptyState'
import { ThreadView } from './features/chat/ThreadView'
import { useChat } from './features/chat/useChat'
import { CoworkPlaceholder } from './features/cowork/CoworkPlaceholder'
import { SettingsModal } from './features/settings/SettingsModal'

export function AppShell(): React.JSX.Element {
  const [mode, setMode] = useState<AppMode>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const chat = useChat()

  return (
    <div className="flex h-screen bg-white">
      {sidebarOpen && (
        <Sidebar
          mode={mode}
          onModeChange={setMode}
          onHideSidebar={() => setSidebarOpen(false)}
          onOpenSettings={() => setSettingsOpen(true)}
        >
          {mode === 'chat' ? (
            <ChatHistoryList
              chats={chat.chats}
              activeChatId={chat.activeChatId}
              onSelectChat={chat.selectChat}
              onNewChat={chat.newChat}
            />
          ) : (
            <p className="px-2.5 text-[13px] text-(--color-text-tertiary)">Nothing here yet</p>
          )}
        </Sidebar>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {sidebarOpen ? (
          <div className="drag h-[52px] shrink-0" />
        ) : (
          <TopIcons align="start" sidebarOpen={false} onToggleSidebar={() => setSidebarOpen(true)} />
        )}
        {mode === 'chat' ? (
          chat.activeChat ? (
            <ThreadView
              messages={chat.activeChat.messages}
              isSending={chat.isSending}
              onSend={chat.send}
              models={chat.models}
              modelId={chat.modelId}
              onModelChange={chat.setModel}
            />
          ) : (
            <EmptyState
              onSend={chat.send}
              models={chat.models}
              modelId={chat.modelId}
              onModelChange={chat.setModel}
            />
          )
        ) : (
          <CoworkPlaceholder />
        )}
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

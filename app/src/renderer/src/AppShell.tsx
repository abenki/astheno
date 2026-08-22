import { useState } from 'react'
import { AppMode, Sidebar } from './components/Sidebar'
import { TopIcons } from './components/TopIcons'
import { ChatHistoryList } from './features/chat/ChatHistoryList'
import { EmptyState } from './features/chat/EmptyState'
import { ThreadView } from './features/chat/ThreadView'
import { useChat } from './features/chat/useChat'
import { CoworkSessionList } from './features/cowork/CoworkSessionList'
import { CoworkThreadView } from './features/cowork/CoworkThreadView'
import { useCowork } from './features/cowork/useCowork'
import { SettingsModal } from './features/settings/SettingsModal'

export function AppShell(): React.JSX.Element {
  const [mode, setMode] = useState<AppMode>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const chat = useChat()
  const cowork = useCowork()

  return (
    <div className="flex h-screen bg-(--color-surface-sunken)">
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
              onRenameChat={chat.renameChat}
            />
          ) : (
            <CoworkSessionList
              sessions={cowork.sessions}
              activeSessionId={cowork.activeSessionId}
              onSelectSession={cowork.selectSession}
              onNewSession={cowork.newSession}
              onRenameSession={cowork.renameSession}
            />
          )}
        </Sidebar>
      )}

      <div
        className={`my-3 mr-3 flex flex-1 flex-col overflow-hidden rounded-(--radius-sm) border border-(--color-border-subtle) bg-(--color-surface-canvas) ${sidebarOpen ? 'ml-3' : 'ml-0'}`}
      >
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
        ) : cowork.activeSession ? (
          <CoworkThreadView
            cwd={cowork.activeSession.cwd}
            messages={cowork.activeSession.messages}
            isSending={cowork.isSending}
            onSend={cowork.send}
            models={cowork.models}
            modelId={cowork.modelId}
            onModelChange={cowork.setModel}
          />
        ) : (
          <EmptyState
            heading="What should we work on?"
            onSend={cowork.send}
            models={cowork.models}
            modelId={cowork.modelId}
            onModelChange={cowork.setModel}
          />
        )}
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

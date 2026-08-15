import { ReactNode } from 'react'
import { MessageCircle, Settings, Users } from 'lucide-react'
import { SidebarItem } from './ui/SidebarItem'
import { TopIcons } from './TopIcons'

export type AppMode = 'chat' | 'cowork'

interface SidebarProps {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
  onHideSidebar: () => void
  children: ReactNode
}

export function Sidebar({
  mode,
  onModeChange,
  onHideSidebar,
  children
}: SidebarProps): React.JSX.Element {
  return (
    <div className="flex h-full w-60 shrink-0 flex-col border-r border-(--color-border-subtle) bg-(--color-surface-sidebar)">
      <TopIcons align="end" sidebarOpen onToggleSidebar={onHideSidebar} />

      <div className="flex flex-col gap-0.5 px-3">
        <SidebarItem
          icon={<MessageCircle />}
          label="Chat"
          active={mode === 'chat'}
          onClick={() => onModeChange('chat')}
        />
        <SidebarItem
          icon={<Users />}
          label="Cowork"
          active={mode === 'cowork'}
          onClick={() => onModeChange('cowork')}
        />
      </div>

      <div className="mt-3 flex flex-1 flex-col overflow-hidden px-3">{children}</div>

      <div className="border-t border-(--color-border-subtle) p-3">
        <SidebarItem icon={<Settings />} label="Settings" />
      </div>
    </div>
  )
}

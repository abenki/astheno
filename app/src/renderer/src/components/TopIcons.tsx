import { PanelLeft, Search } from 'lucide-react'
import { IconButton } from './ui/IconButton'

interface TopIconsProps {
  align: 'start' | 'end'
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

export function TopIcons({ align, onToggleSidebar, sidebarOpen }: TopIconsProps): React.JSX.Element {
  return (
    <div
      className={`drag flex h-[52px] shrink-0 items-center gap-1 pl-20 pr-3 ${align === 'end' ? 'justify-end' : ''}`}
    >
      <IconButton aria-label="Search" size="md">
        <Search />
      </IconButton>
      <IconButton
        aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        size="md"
        onClick={onToggleSidebar}
      >
        <PanelLeft />
      </IconButton>
    </div>
  )
}

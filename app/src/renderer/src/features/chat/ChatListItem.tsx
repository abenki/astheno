import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { IconButton } from '../../components/ui/IconButton'
import { Menu } from '../../components/ui/Menu'

interface ChatListItemProps {
  title: string
  active?: boolean
  onClick?: () => void
  onRename: (title: string) => void
}

export function ChatListItem({
  title,
  active = false,
  onClick,
  onRename
}: ChatListItemProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) return
    setDraft(title)
    const id = requestAnimationFrame(() => inputRef.current?.select())
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  function commit(): void {
    const trimmed = draft.trim()
    setEditing(false)
    if (trimmed && trimmed !== title) onRename(trimmed)
  }

  if (editing) {
    return (
      <div className="flex h-8 w-full items-center rounded-(--radius-md) bg-(--color-surface-sunken) px-2.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setEditing(false)
            }
          }}
          className="no-drag w-full bg-transparent text-[13.5px] text-(--color-text-primary) outline-none"
        />
      </div>
    )
  }

  return (
    <div className="group relative flex h-8 w-full items-center">
      <button
        onClick={onClick}
        className={`no-drag flex h-8 w-full select-none items-center rounded-(--radius-md) py-2 pl-2.5 pr-7 text-left text-[13.5px] transition-colors duration-100 ${
          active
            ? 'bg-(--color-surface-sunken) font-medium text-(--color-text-primary)'
            : 'text-(--color-text-secondary) hover:bg-(--color-surface-sunken) hover:text-(--color-text-primary)'
        }`}
      >
        <span className="truncate">{title}</span>
      </button>
      <Menu
        align="end"
        side="bottom"
        rootClassName="absolute right-1"
        options={[{ id: 'rename', label: 'Rename' }]}
        onSelect={(id) => {
          if (id === 'rename') setEditing(true)
        }}
        trigger={({ open, toggle }) => (
          <IconButton
            aria-label="Chat options"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              toggle()
            }}
            className={open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          >
            <MoreHorizontal />
          </IconButton>
        )}
      />
    </div>
  )
}

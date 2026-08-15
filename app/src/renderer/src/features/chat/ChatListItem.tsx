interface ChatListItemProps {
  title: string
  active?: boolean
  onClick?: () => void
}

export function ChatListItem({ title, active = false, onClick }: ChatListItemProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`no-drag flex h-8 w-full select-none items-center rounded-(--radius-md) px-2.5 text-left text-[13.5px] transition-colors duration-100 ${
        active
          ? 'bg-(--color-surface-sunken) font-medium text-(--color-text-primary)'
          : 'text-(--color-text-secondary) hover:bg-(--color-surface-sunken) hover:text-(--color-text-primary)'
      }`}
    >
      <span className="truncate">{title}</span>
    </button>
  )
}

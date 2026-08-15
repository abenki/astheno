interface TabItem {
  value: string
  label: string
  icon?: React.ReactNode
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function Tabs({ items, value, onChange, className = '' }: TabsProps): React.JSX.Element {
  return (
    <div
      className={`no-drag inline-flex items-center gap-0.5 rounded-(--radius-pill) bg-(--color-surface-sunken) p-0.5 ${className}`}
      role="tablist"
    >
      {items.map((item) => {
        const isActive = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-(--radius-pill) px-3 text-[13px] font-medium transition-colors duration-100 ${
              isActive
                ? 'bg-white text-(--color-text-primary) shadow-(--shadow-xs)'
                : 'text-(--color-text-secondary) hover:text-(--color-text-primary)'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

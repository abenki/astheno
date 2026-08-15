import { ButtonHTMLAttributes } from 'react'

interface SidebarItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label: string
  active?: boolean
  trailing?: React.ReactNode
}

export function SidebarItem({
  icon,
  label,
  active = false,
  trailing,
  className = '',
  ...props
}: SidebarItemProps): React.JSX.Element {
  return (
    <button
      className={`no-drag flex h-8 w-full select-none items-center gap-2.5 rounded-(--radius-md) px-2.5 text-[13.5px] transition-colors duration-100 ${
        active
          ? 'bg-(--color-surface-sunken) text-(--color-text-primary) font-medium'
          : 'text-(--color-text-secondary) hover:bg-(--color-surface-sunken) hover:text-(--color-text-primary)'
      } ${className}`}
      {...props}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      <span className="flex-1 truncate text-left">{label}</span>
      {trailing}
    </button>
  )
}

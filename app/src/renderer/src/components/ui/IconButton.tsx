import { ButtonHTMLAttributes, forwardRef } from 'react'

type Size = 'sm' | 'md' | 'lg'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: Size
  active?: boolean
  'aria-label': string
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-6 w-6 rounded-(--radius-sm) [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'h-8 w-8 rounded-(--radius-sm) [&_svg]:h-4 [&_svg]:w-4',
  lg: 'h-10 w-10 rounded-(--radius-md) [&_svg]:h-[18px] [&_svg]:w-[18px]'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 'md', active = false, className = '', children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`no-drag inline-flex select-none items-center justify-center text-(--color-text-secondary) transition-colors duration-100 hover:bg-(--color-surface-sunken) hover:text-(--color-text-primary) active:bg-(--color-border-subtle) disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-(--color-surface-sunken) text-(--color-text-primary)' : ''
      } ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})

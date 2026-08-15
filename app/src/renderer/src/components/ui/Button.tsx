import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-(--color-text-primary) text-white hover:bg-black active:bg-black disabled:bg-(--color-text-disabled)',
  secondary:
    'bg-white text-(--color-text-primary) border border-(--color-border-default) hover:bg-(--color-surface-sunken) active:bg-(--color-border-subtle)',
  ghost:
    'bg-transparent text-(--color-text-primary) hover:bg-(--color-surface-sunken) active:bg-(--color-border-subtle)',
  accent:
    'bg-(--color-accent) text-white hover:bg-(--color-accent-hover) active:bg-(--color-accent-hover)',
  danger: 'bg-(--color-danger) text-white hover:brightness-95 active:brightness-90'
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[13px] gap-1.5 rounded-(--radius-sm)',
  md: 'h-9 px-3.5 text-[14px] gap-2 rounded-(--radius-md)',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-(--radius-md)'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className = '', children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`no-drag inline-flex select-none items-center justify-center font-medium transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})

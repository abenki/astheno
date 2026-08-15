import { HTMLAttributes } from 'react'

type Elevation = 'flat' | 'sm' | 'md' | 'lg'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation
}

const elevationClasses: Record<Elevation, string> = {
  flat: 'shadow-none border border-(--color-border-subtle)',
  sm: 'shadow-(--shadow-sm) border border-(--color-border-subtle)',
  md: 'shadow-(--shadow-md) border border-(--color-border-subtle)',
  lg: 'shadow-(--shadow-lg) border border-(--color-border-subtle)'
}

export function Card({
  elevation = 'sm',
  className = '',
  children,
  ...props
}: CardProps): React.JSX.Element {
  return (
    <div
      className={`rounded-(--radius-lg) bg-(--color-surface-raised) ${elevationClasses[elevation]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

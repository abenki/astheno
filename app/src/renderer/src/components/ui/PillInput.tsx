import { TextareaHTMLAttributes, forwardRef } from 'react'

interface PillInputProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  leading?: React.ReactNode
  trailing?: React.ReactNode
}

export const PillInput = forwardRef<HTMLTextAreaElement, PillInputProps>(function PillInput(
  { leading, trailing, className = '', ...props },
  ref
) {
  return (
    <div
      className={`rounded-(--radius-xl) border border-(--color-border-default) bg-white shadow-(--shadow-sm) transition-shadow duration-100 focus-within:border-(--color-border-strong) focus-within:shadow-(--shadow-md) ${className}`}
    >
      <textarea
        ref={ref}
        rows={1}
        className="max-h-40 w-full resize-none bg-transparent px-4 pt-3.5 text-[15px] text-(--color-text-primary) placeholder:text-(--color-text-tertiary) focus:outline-none"
        {...props}
      />
      <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1">
        <div className="flex items-center gap-1">{leading}</div>
        <div className="flex items-center gap-1.5">{trailing}</div>
      </div>
    </div>
  )
})

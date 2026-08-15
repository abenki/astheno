import { useEffect, useRef, useState } from 'react'

export interface MenuOption {
  id: string
  label: string
}

interface MenuProps {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode
  options: MenuOption[]
  selectedId?: string
  onSelect: (id: string) => void
  align?: 'start' | 'end'
}

export function Menu({ trigger, options, selectedId, onSelect, align = 'end' }: MenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent): void {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={`no-drag absolute bottom-full z-10 mb-1.5 max-h-64 min-w-[180px] overflow-y-auto rounded-(--radius-md) border border-(--color-border-subtle) bg-(--color-surface-overlay) py-1 shadow-(--shadow-md) ${
            align === 'end' ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onSelect(option.id)
                setOpen(false)
              }}
              className={`flex w-full items-center px-3 py-1.5 text-left text-[13px] hover:bg-(--color-surface-sunken) ${
                option.id === selectedId
                  ? 'font-medium text-(--color-text-primary)'
                  : 'text-(--color-text-secondary)'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

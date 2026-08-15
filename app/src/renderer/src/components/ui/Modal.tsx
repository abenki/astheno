import { X } from 'lucide-react'
import { useEffect } from 'react'
import { IconButton } from './IconButton'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ title, onClose, children }: ModalProps): React.JSX.Element {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="no-drag w-full max-w-md rounded-(--radius-lg) border border-(--color-border-subtle) bg-(--color-surface-raised) shadow-(--shadow-lg)"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-(--color-border-subtle) px-5 py-4">
          <h2 className="text-[15px] font-medium text-(--color-text-primary)">{title}</h2>
          <IconButton aria-label="Close" size="sm" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

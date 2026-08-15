import { ChevronDown, Mic, Plus, SlidersHorizontal, Square, ArrowUp } from 'lucide-react'
import { KeyboardEvent, useState } from 'react'
import { IconButton } from '../../components/ui/IconButton'
import { Menu } from '../../components/ui/Menu'
import { PillInput } from '../../components/ui/PillInput'
import { ModelOption } from './types'

interface ComposerProps {
  onSend: (text: string) => void
  isSending: boolean
  models?: ModelOption[]
  modelId?: string | null
  onModelChange?: (modelId: string) => void
  placeholder?: string
  className?: string
}

export function Composer({
  onSend,
  isSending,
  models = [],
  modelId = null,
  onModelChange,
  placeholder = 'Ask anything...',
  className = ''
}: ComposerProps): React.JSX.Element {
  const [value, setValue] = useState('')
  const activeModel = models.find((m) => m.id === modelId)

  function submit(): void {
    const text = value.trim()
    if (!text || isSending) return
    onSend(text)
    setValue('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <PillInput
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={isSending}
      leading={
        <>
          <IconButton aria-label="Attach" size="sm">
            <Plus />
          </IconButton>
          <IconButton aria-label="Tools" size="sm">
            <SlidersHorizontal />
          </IconButton>
        </>
      }
      trailing={
        <>
          {models.length > 0 && onModelChange && (
            <Menu
              align="end"
              options={models.map((m) => ({ id: m.id, label: m.name }))}
              selectedId={modelId ?? undefined}
              onSelect={onModelChange}
              trigger={({ toggle }) => (
                <button
                  onClick={toggle}
                  className="no-drag inline-flex h-7 items-center gap-1 rounded-(--radius-pill) px-2 text-[12.5px] font-medium text-(--color-text-secondary) hover:bg-(--color-surface-sunken)"
                >
                  {activeModel?.name ?? 'Select model'}
                  <ChevronDown className="h-3 w-3" />
                </button>
              )}
            />
          )}
          <IconButton aria-label="Voice" size="sm">
            <Mic />
          </IconButton>
          <IconButton
            aria-label={isSending ? 'Sending' : 'Send'}
            size="sm"
            disabled={isSending || !value.trim()}
            onClick={submit}
            className="bg-(--color-accent-subtle) text-(--color-accent) hover:bg-(--color-accent-subtle) disabled:bg-(--color-surface-sunken) disabled:text-(--color-text-disabled)"
          >
            {isSending ? <Square className="h-3 w-3 fill-current" /> : <ArrowUp />}
          </IconButton>
        </>
      }
    />
  )
}

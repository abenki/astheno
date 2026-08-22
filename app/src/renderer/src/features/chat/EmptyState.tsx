import { Logo } from '../../components/Logo'
import { Composer } from './Composer'
import { ModelOption } from './types'

interface EmptyStateProps {
  onSend: (text: string) => void
  models: ModelOption[]
  modelId: string | null
  onModelChange: (modelId: string) => void
  heading?: string
}

export function EmptyState({
  onSend,
  models,
  modelId,
  onModelChange,
  heading = 'Where should we begin?'
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8">
      <Logo size={32} className="text-(--color-text-primary)" />
      <p className="text-lg text-(--color-text-primary)">{heading}</p>
      <div className="w-full max-w-lg">
        <Composer
          onSend={onSend}
          isSending={false}
          models={models}
          modelId={modelId}
          onModelChange={onModelChange}
        />
      </div>
    </div>
  )
}

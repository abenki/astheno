import { Logo } from '../../components/Logo'
import { Composer } from './Composer'
import { ModelOption } from './types'

interface EmptyStateProps {
  onSend: (text: string) => void
  models: ModelOption[]
  modelId: string | null
  onModelChange: (modelId: string) => void
}

export function EmptyState({ onSend, models, modelId, onModelChange }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8">
      <Logo size={32} className="text-(--color-text-primary)" />
      <p className="text-lg text-(--color-text-primary)">Where should we begin?</p>
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

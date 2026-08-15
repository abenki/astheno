import { Message, ModelOption } from './types'
import { MessageList } from './MessageList'
import { Composer } from './Composer'

interface ThreadViewProps {
  messages: Message[]
  isSending: boolean
  onSend: (text: string) => void
  models: ModelOption[]
  modelId: string | null
  onModelChange: (modelId: string) => void
}

export function ThreadView({
  messages,
  isSending,
  onSend,
  models,
  modelId,
  onModelChange
}: ThreadViewProps): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageList messages={messages} isSending={isSending} />
      <div className="bg-white px-8 py-4">
        <div className="mx-auto max-w-3xl">
          <Composer
            onSend={onSend}
            isSending={isSending}
            models={models}
            modelId={modelId}
            onModelChange={onModelChange}
          />
        </div>
      </div>
    </div>
  )
}

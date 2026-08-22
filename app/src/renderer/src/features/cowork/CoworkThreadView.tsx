import { FolderOpen } from 'lucide-react'
import { Message, ModelOption } from './types'
import { CoworkMessageList } from './CoworkMessageList'
import { Composer } from '../chat/Composer'

interface CoworkThreadViewProps {
  cwd: string
  messages: Message[]
  isSending: boolean
  onSend: (text: string) => void
  models: ModelOption[]
  modelId: string | null
  onModelChange: (modelId: string) => void
}

function folderLabel(cwd: string): string {
  return cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd
}

export function CoworkThreadView({
  cwd,
  messages,
  isSending,
  onSend,
  models,
  modelId,
  onModelChange
}: CoworkThreadViewProps): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        className="flex items-center gap-1.5 border-b border-(--color-border-subtle) px-8 py-2 text-[12.5px] text-(--color-text-tertiary)"
        title={cwd}
      >
        <FolderOpen className="h-3.5 w-3.5" />
        {folderLabel(cwd)}
      </div>
      <CoworkMessageList messages={messages} isSending={isSending} />
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

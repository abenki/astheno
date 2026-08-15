import { Message } from './types'
import { MessageList } from './MessageList'
import { Composer } from './Composer'

interface ThreadViewProps {
  messages: Message[]
  isSending: boolean
  onSend: (text: string) => void
}

export function ThreadView({ messages, isSending, onSend }: ThreadViewProps): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageList messages={messages} isSending={isSending} />
      <div className="bg-white px-8 py-4">
        <div className="mx-auto max-w-3xl">
          <Composer onSend={onSend} isSending={isSending} />
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { Message } from './types'
import { MessageBubble } from './MessageBubble'
import { ThinkingIndicator } from './ThinkingIndicator'

interface MessageListProps {
  messages: Message[]
  isSending: boolean
}

export function MessageList({ messages, isSending }: MessageListProps): React.JSX.Element {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, isSending])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-8 py-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isSending && <ThinkingIndicator />}
        <div ref={endRef} />
      </div>
    </div>
  )
}

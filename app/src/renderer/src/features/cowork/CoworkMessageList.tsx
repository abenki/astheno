import { useEffect, useRef } from 'react'
import { Message } from './types'
import { CoworkMessageBubble } from './CoworkMessageBubble'
import { ThinkingIndicator } from '../chat/ThinkingIndicator'

interface CoworkMessageListProps {
  messages: Message[]
  isSending: boolean
}

export function CoworkMessageList({ messages, isSending }: CoworkMessageListProps): React.JSX.Element {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, isSending])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-8 py-6">
        {messages.map((message) => (
          <CoworkMessageBubble key={message.id} message={message} />
        ))}
        {isSending && <ThinkingIndicator />}
        <div ref={endRef} />
      </div>
    </div>
  )
}

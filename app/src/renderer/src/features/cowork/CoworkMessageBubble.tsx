import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from '../../components/ui/IconButton'
import { Markdown } from '../../components/Markdown'
import { Message } from './types'
import { ToolCallChip } from './ToolCallChip'

interface CoworkMessageBubbleProps {
  message: Message
}

export function CoworkMessageBubble({ message }: CoworkMessageBubbleProps): React.JSX.Element {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] rounded-(--radius-lg) bg-(--color-text-primary) px-4 py-2.5 text-[14.5px] leading-relaxed text-white">
          {message.content}
        </div>
      </div>
    )
  }

  return <AssistantMessage message={message} />
}

function AssistantMessage({ message }: CoworkMessageBubbleProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="group flex flex-col gap-2">
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {message.toolCalls.map((toolCall) => (
            <ToolCallChip key={toolCall.toolCallId} toolCall={toolCall} />
          ))}
        </div>
      )}
      {message.content && (
        <div className="text-[14.5px] leading-relaxed text-(--color-text-primary)">
          <Markdown>{message.content}</Markdown>
        </div>
      )}
      {message.content && (
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-100 group-hover:opacity-100">
          <IconButton aria-label="Copy" size="sm" onClick={handleCopy}>
            {copied ? <Check /> : <Copy />}
          </IconButton>
        </div>
      )}
    </div>
  )
}

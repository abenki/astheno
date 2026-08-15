import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ChatListItem } from './ChatListItem'
import { groupChatsByRecency } from './groupChats'
import { Chat } from './types'

interface ChatHistoryListProps {
  chats: Chat[]
  activeChatId: string | null
  onSelectChat: (id: string) => void
  onNewChat: () => void
}

export function ChatHistoryList({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat
}: ChatHistoryListProps): React.JSX.Element {
  const groups = groupChatsByRecency(chats)

  return (
    <div className="flex h-full flex-col">
      <Button variant="secondary" size="md" className="w-full justify-start gap-2" onClick={onNewChat}>
        <Plus className="h-4 w-4" />
        New chat
      </Button>

      <div className="mt-4 flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <p className="px-2.5 py-1 text-[13px] text-(--color-text-tertiary)">No chats yet</p>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-0.5">
                <div className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-(--color-text-tertiary)">
                  {group.label}
                </div>
                {group.chats.map((chat) => (
                  <ChatListItem
                    key={chat.id}
                    title={chat.title}
                    active={chat.id === activeChatId}
                    onClick={() => onSelectChat(chat.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

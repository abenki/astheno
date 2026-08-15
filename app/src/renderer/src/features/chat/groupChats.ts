import { Chat } from './types'

const DAY = 24 * 60 * 60 * 1000

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export interface ChatGroup {
  label: string
  chats: Chat[]
}

export function groupChatsByRecency(chats: Chat[]): ChatGroup[] {
  const today = startOfDay(Date.now())
  const buckets: ChatGroup[] = [
    { label: 'Today', chats: [] },
    { label: 'Yesterday', chats: [] },
    { label: 'Previous 7 days', chats: [] },
    { label: 'Older', chats: [] }
  ]

  for (const chat of [...chats].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const daysAgo = Math.floor((today - startOfDay(chat.updatedAt)) / DAY)
    if (daysAgo <= 0) buckets[0].chats.push(chat)
    else if (daysAgo === 1) buckets[1].chats.push(chat)
    else if (daysAgo <= 7) buckets[2].chats.push(chat)
    else buckets[3].chats.push(chat)
  }

  return buckets.filter((b) => b.chats.length > 0)
}

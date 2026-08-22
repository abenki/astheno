import { Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ChatListItem } from '../chat/ChatListItem'
import { groupSessionsByFolder } from './groupByFolder'
import { CoworkSession } from './types'

interface CoworkSessionListProps {
  sessions: CoworkSession[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onRenameSession: (id: string, title: string) => void
}

export function CoworkSessionList({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onRenameSession
}: CoworkSessionListProps): React.JSX.Element {
  const groups = groupSessionsByFolder(sessions)

  return (
    <div className="flex h-full flex-col">
      <Button variant="secondary" size="md" className="w-full justify-start gap-2" onClick={onNewSession}>
        <Plus className="h-4 w-4" />
        New task
      </Button>

      <div className="mt-4 flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <p className="px-2.5 py-1 text-[13px] text-(--color-text-tertiary)">No tasks yet</p>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <div key={group.cwd} className="flex flex-col gap-0.5">
                <div
                  className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-(--color-text-tertiary)"
                  title={group.cwd}
                >
                  {group.label}
                </div>
                {group.sessions.map((session) => (
                  <ChatListItem
                    key={session.id}
                    title={session.title}
                    active={session.id === activeSessionId}
                    onClick={() => onSelectSession(session.id)}
                    onRename={(title) => onRenameSession(session.id, title)}
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

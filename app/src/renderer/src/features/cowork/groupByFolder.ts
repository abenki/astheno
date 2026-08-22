import { CoworkSession } from './types'

export interface CoworkFolderGroup {
  cwd: string
  label: string
  sessions: CoworkSession[]
}

function folderLabel(cwd: string): string {
  return cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd
}

export function groupSessionsByFolder(sessions: CoworkSession[]): CoworkFolderGroup[] {
  const byFolder = new Map<string, CoworkSession[]>()
  for (const session of sessions) {
    const existing = byFolder.get(session.cwd)
    if (existing) existing.push(session)
    else byFolder.set(session.cwd, [session])
  }

  const groups: CoworkFolderGroup[] = [...byFolder.entries()].map(([cwd, groupSessions]) => ({
    cwd,
    label: folderLabel(cwd),
    sessions: [...groupSessions].sort((a, b) => b.updatedAt - a.updatedAt)
  }))

  groups.sort((a, b) => b.sessions[0].updatedAt - a.sessions[0].updatedAt)
  return groups
}

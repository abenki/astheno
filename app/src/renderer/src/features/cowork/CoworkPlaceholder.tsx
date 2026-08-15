import { Users } from 'lucide-react'

export function CoworkPlaceholder(): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-(--radius-lg) bg-(--color-surface-sunken) text-(--color-text-secondary)">
        <Users className="h-5 w-5" />
      </div>
      <p className="text-[15px] font-medium text-(--color-text-primary)">Cowork isn't built yet</p>
      <p className="max-w-sm text-[13.5px] text-(--color-text-secondary)">
        This is where the agent cowork surface will live — task delegation, approvals, and
        connector-driven work. Chat comes first.
      </p>
    </div>
  )
}

import { AlertTriangle, Loader2, Wrench } from 'lucide-react'
import { ToolCall } from './types'

interface ToolCallChipProps {
  toolCall: ToolCall
}

function summarizeArgs(args: unknown): string {
  if (!args || typeof args !== 'object') return ''
  const record = args as Record<string, unknown>
  const value = record.command ?? record.path ?? record.pattern ?? record.file_path ?? null
  if (typeof value === 'string') return value
  const json = JSON.stringify(args)
  return json.length > 60 ? `${json.slice(0, 60)}…` : json
}

export function ToolCallChip({ toolCall }: ToolCallChipProps): React.JSX.Element {
  const summary = summarizeArgs(toolCall.args)

  return (
    <details className="group rounded-(--radius-md) border border-(--color-border-subtle) bg-(--color-surface-sunken) px-2.5 py-1.5 text-[13px]">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-(--color-text-secondary)">
        {toolCall.pending ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : toolCall.isError ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-(--color-accent)" />
        ) : (
          <Wrench className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="font-medium text-(--color-text-primary)">{toolCall.toolName}</span>
        {summary && <span className="truncate font-mono text-[12px] text-(--color-text-tertiary)">{summary}</span>}
      </summary>
      {toolCall.result !== undefined && (
        <pre className="mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-(--radius-sm) bg-(--color-surface-canvas) px-2 py-1.5 font-mono text-[12px] text-(--color-text-secondary)">
          {toolCall.result || '(empty result)'}
        </pre>
      )}
    </details>
  )
}

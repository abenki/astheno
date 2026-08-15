export function ThinkingIndicator(): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--color-text-tertiary) [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--color-text-tertiary) [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--color-text-tertiary)" />
    </div>
  )
}

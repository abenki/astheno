import ReactMarkdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

const components: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-(--color-accent) underline underline-offset-2 hover:text-(--color-accent-hover)"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-(--color-border-strong) pl-3 text-(--color-text-secondary) last:mb-0">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return <code className={className}>{children}</code>
    }
    return (
      <code className="rounded-(--radius-sm) bg-(--color-surface-sunken) px-1.5 py-0.5 font-(family-name:--font-mono) text-[13px]">
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-(--radius-md) bg-(--color-surface-sunken) p-3 font-(family-name:--font-mono) text-[13px] leading-relaxed last:mb-0">
      {children}
    </pre>
  ),
  h1: ({ children }) => <h1 className="mb-2 text-[18px] font-semibold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 text-[16px] font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 text-[15px] font-semibold">{children}</h3>,
  hr: () => <hr className="my-3 border-(--color-border-subtle)" />
}

interface MarkdownProps {
  children: string
}

export function Markdown({ children }: MarkdownProps): React.JSX.Element {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  )
}

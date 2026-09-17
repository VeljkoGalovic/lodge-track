import { ReactNode } from "react"

interface PageHeaderProps {
  /** Small uppercase pill above the title, matching the landing page's
   *  section eyebrows. */
  eyebrow?: string
  title: string
  description?: string
  /** Primary action, rendered right-aligned on wide screens. */
  action?: ReactNode
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow && (
          <span className="eyebrow-pill">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            {eyebrow}
          </span>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1>
        {description && <p className="max-w-2xl text-subtle-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div>}
    </div>
  )
}

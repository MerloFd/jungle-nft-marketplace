import * as React from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  /** Ações (ex.: botão "Limpar filtros"). */
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong px-6 py-12 text-center', className)}
    >
      <div aria-hidden="true" className="text-muted-foreground [&_svg]:size-10">
        {icon ?? <Inbox />}
      </div>
      <h2 className="text-xl font-semibold">{title}</h2>
      {description ? <p className="max-w-md text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}

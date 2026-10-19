import * as React from 'react'
import { cn } from '@/lib/utils'

/** Bloco de carregamento com shimmer. Passe dimensões via className para evitar layout shift. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" data-slot="skeleton" className={cn('shimmer rounded-md', className)} {...props} />
}

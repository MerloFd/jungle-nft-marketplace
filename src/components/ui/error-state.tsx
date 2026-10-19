import * as React from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export interface ErrorStateProps {
  title?: React.ReactNode
  description?: React.ReactNode
  onRetry?: () => void
  /** Mostra o botão em loading enquanto a nova tentativa acontece. */
  retrying?: boolean
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Verifique sua conexão e tente novamente.',
  onRetry,
  retrying,
  retryLabel = 'Tentar novamente',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/60 bg-destructive/10 px-6 py-10 text-center', className)}
    >
      <AlertTriangle aria-hidden="true" className="size-9 text-destructive-text" />
      <h2 className="text-xl font-semibold">{title}</h2>
      {description ? <p className="max-w-md text-muted-foreground">{description}</p> : null}
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} loading={retrying} className="mt-2">
          {retrying ? null : <RotateCw aria-hidden="true" />}
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}

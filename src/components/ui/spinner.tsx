import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SpinnerProps {
  className?: string
  /** Texto para leitores de tela. Se omitido, o spinner é decorativo. */
  label?: string
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <>
      <Loader2 aria-hidden="true" className={cn('size-4 animate-spin', className)} />
      {label ? <span className="sr-only">{label}</span> : null}
    </>
  )
}

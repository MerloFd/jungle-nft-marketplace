import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

export interface UpdatingIndicatorProps {
  /** Mostra o indicador apenas quando há refetch em segundo plano (dados já visíveis). */
  active: boolean
  label?: string
  /** Identificador do bloco: vira data-testid="<id>-updating". */
  id: string
  className?: string
}

/**
 * Indicador de atualização em segundo plano. Mantém o conteúdo na tela
 * (nada de skeleton) e anuncia a revalidação para leitores de tela.
 */
export function UpdatingIndicator({ active, label = 'Atualizando…', id, className }: UpdatingIndicatorProps) {
  if (!active) return null
  return (
    <span
      role="status"
      data-testid={`${id}-updating`}
      className={cn('inline-flex items-center gap-1.5 text-sm text-muted-foreground', className)}
    >
      <Spinner className="size-3.5" />
      {label}
    </span>
  )
}

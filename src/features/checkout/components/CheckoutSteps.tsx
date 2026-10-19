import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CheckoutStep = 'buyer' | 'wallet' | 'review'

export const STEP_ORDER: CheckoutStep[] = ['buyer', 'wallet', 'review']

const STEP_LABEL: Record<CheckoutStep, string> = {
  buyer: 'Seus dados',
  wallet: 'Carteira e rede',
  review: 'Revisão e pagamento',
}

export interface CheckoutStepsProps {
  current: CheckoutStep
  /** Etapas já concluídas, às quais o usuário pode voltar. */
  reachable: CheckoutStep[]
  onNavigate: (step: CheckoutStep) => void
}

/** Indicador de progresso: lista ordenada com `aria-current="step"` na etapa atual. */
export function CheckoutSteps({ current, reachable, onNavigate }: CheckoutStepsProps) {
  const currentIndex = STEP_ORDER.indexOf(current)

  return (
    <nav aria-label="Etapas do pagamento">
      <ol className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        {STEP_ORDER.map((step, index) => {
          const isCurrent = step === current
          const done = index < currentIndex
          const canGo = reachable.includes(step) && !isCurrent
          return (
            <li
              key={step}
              data-testid={`checkout-step-${index + 1}`}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex flex-1 items-center gap-3 rounded-xl border px-4 py-3',
                isCurrent ? 'border-brand bg-card' : 'border-border bg-card/60',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  isCurrent ? 'bg-primary text-primary-foreground' : done ? 'bg-success/25 text-success-text' : 'bg-accent text-muted-foreground',
                )}
              >
                {done ? <Check className="size-4" /> : index + 1}
              </span>
              {canGo ? (
                <button
                  type="button"
                  onClick={() => onNavigate(step)}
                  className="text-left text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="sr-only">Voltar para a etapa {index + 1}: </span>
                  {STEP_LABEL[step]}
                </button>
              ) : (
                <span className={cn('text-sm font-semibold', isCurrent ? 'text-foreground' : 'text-muted-foreground')}>
                  <span className="sr-only">Etapa {index + 1}: </span>
                  {STEP_LABEL[step]}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export interface QuantityStepperProps {
  value: number
  /** Limite efetivo: min(disponíveis, máximo por pedido). 0 = nada a comprar. */
  max: number
  /** Qual regra definiu o limite, para explicar ao usuário. */
  limitReason: 'stock' | 'per-order'
  onChange: (value: number) => void
  disabled?: boolean
}

export function QuantityStepper({ value, max, limitReason, onChange, disabled }: QuantityStepperProps) {
  const atMax = max > 0 && value >= max
  const hint =
    max === 0
      ? 'Sem unidades disponíveis nesta edição.'
      : atMax
        ? limitReason === 'stock'
          ? `Limite atingido: só há ${max} ${max === 1 ? 'unidade' : 'unidades'} disponíveis.`
          : `Limite atingido: máximo de ${max} por pedido.`
        : `Até ${max} ${max === 1 ? 'unidade' : 'unidades'} por pedido.`

  return (
    <Field label="Quantidade" id="qty-input" hint={hint} className="max-w-[220px]">
      {(controlProps) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            data-testid="qty-decrease"
            aria-label="Diminuir quantidade"
            disabled={disabled || value <= 1}
            onClick={() => onChange(value - 1)}
          >
            <Minus aria-hidden="true" />
          </Button>
          <Input
            {...controlProps}
            data-testid="qty-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.max(1, max)}
            step={1}
            disabled={disabled || max === 0}
            value={value}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10)
              if (Number.isNaN(parsed)) return
              onChange(parsed)
            }}
            className="w-20 text-center"
          />
          <Button
            variant="outline"
            size="icon"
            data-testid="qty-increase"
            aria-label="Aumentar quantidade"
            disabled={disabled || atMax || max === 0}
            onClick={() => onChange(value + 1)}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      )}
    </Field>
  )
}

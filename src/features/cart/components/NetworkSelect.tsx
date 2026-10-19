import { NETWORK_LABEL, Network } from '@/contracts'
import { Field } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface NetworkSelectProps {
  value: Network
  /** Redes permitidas (no checkout, as redes suportadas pela carteira escolhida). */
  options?: readonly Network[]
  disabled?: boolean
  error?: string | null
  label?: string
  hint?: string
  testId?: string
  onChange: (network: Network) => void
}

/** Seleção de rede. A rede muda a taxa cobrada pela API. */
export function NetworkSelect({
  value,
  options = Network.options,
  disabled,
  error,
  label = 'Rede',
  hint,
  testId,
  onChange,
}: NetworkSelectProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(fieldProps) => (
        <Select value={value} disabled={disabled} onValueChange={(v) => onChange(Network.parse(v))}>
          <SelectTrigger {...fieldProps} data-testid={testId} aria-label={label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((n) => (
              <SelectItem key={n} value={n}>
                {NETWORK_LABEL[n]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  )
}

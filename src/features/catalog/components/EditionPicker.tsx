import type { Edition } from '@/contracts'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export interface EditionPickerProps {
  editions: Edition[]
  selectedId: string
  onSelect: (editionId: string) => void
}

/** Escolha da edição. Edição esgotada fica desabilitada e identificada como tal. */
export function EditionPicker({ editions, selectedId, onSelect }: EditionPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Edições</h2>
      <RadioGroup value={selectedId} onValueChange={onSelect} aria-label="Escolha a edição">
        {editions.map((edition) => {
          const soldOut = edition.available === 0
          const id = `edition-${edition.id}`
          return (
            <div
              key={edition.id}
              data-testid={id}
              data-sold-out={soldOut ? 'true' : undefined}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4',
                edition.id === selectedId ? 'border-brand bg-accent/40' : 'border-border',
                soldOut && 'opacity-60',
              )}
            >
              <RadioGroupItem id={id} value={edition.id} disabled={soldOut} className="mt-1" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Label htmlFor={id} className="flex flex-wrap items-center gap-2 text-base">
                  {edition.name}
                  {soldOut ? <Badge variant="destructive">Esgotada</Badge> : null}
                </Label>
                <p className="font-mono text-lg font-semibold text-accent-text">{formatEth(edition.priceEth)}</p>
                <p className="text-sm text-muted-foreground">
                  {soldOut ? `0 de ${edition.supply} disponíveis` : `${edition.available} de ${edition.supply} disponíveis`}
                  {' · '}
                  {`máximo ${edition.maxPerOrder} por pedido`}
                </p>
              </div>
            </div>
          )
        })}
      </RadioGroup>
    </div>
  )
}

import * as React from 'react'
import { Availability, Category, CATEGORY_LABEL, type Category as CategoryType } from '@/contracts'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CatalogSearch } from '../search'

const AVAILABILITY_LABEL: Record<Availability, string> = {
  all: 'Todos',
  available: 'Disponíveis',
  'sold-out': 'Esgotados',
}

const ETH_DRAFT = /^\d*([.,]\d*)?$/
const ETH_VALID = /^\d+(\.\d+)?$/

export interface CatalogFiltersProps {
  value: CatalogSearch
  /** Controles discretos (categoria, disponibilidade): entram no histórico. */
  onPatch: (patch: Partial<CatalogSearch>) => void
  /** Campos digitados (preço): substituem a entrada atual para não poluir o histórico. */
  onPatchQuiet: (patch: Partial<CatalogSearch>) => void
  onClear: () => void
  hasActiveFilters: boolean
}

/**
 * Barra lateral do Figma (310px, gap 24px): Coleções, Faixa de preço e
 * Disponibilidade. A seção "Rede" do desenho não existe aqui porque
 * `GET /api/nfts` não aceita filtro por rede; as contagens por coleção também
 * não vêm da API e por isso não aparecem (número inventado é dado fictício).
 */
export function CatalogFilters({ value, onPatch, onPatchQuiet, onClear, hasActiveFilters }: CatalogFiltersProps) {
  const selected = value.category ?? []

  const toggleCategory = (category: CategoryType, checked: boolean) => {
    const next = checked ? [...selected, category] : selected.filter((c) => c !== category)
    onPatch({ category: next.length ? next : undefined })
  }

  const min = usePriceDraft(value.minPrice, (minPrice) => onPatchQuiet({ minPrice }))
  const max = usePriceDraft(value.maxPrice, (maxPrice) => onPatchQuiet({ maxPrice }))

  const applyPrice = () => {
    if (min.invalid || max.invalid) return
    min.markSent()
    max.markSent()
    onPatchQuiet({ minPrice: min.value, maxPrice: max.value })
  }

  return (
    <div data-testid="catalog-filters" className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-3 text-lg font-bold uppercase tracking-[0.1em]">Coleções</legend>
        {Category.options.map((category) => {
          const id = `filter-category-${category}`
          return (
            <div key={category} className="flex min-h-9 items-center gap-3">
              <Checkbox
                id={id}
                data-testid={id}
                checked={selected.includes(category)}
                onCheckedChange={(checked) => toggleCategory(category, checked === true)}
              />
              <Label htmlFor={id} className="text-sm font-normal">
                {CATEGORY_LABEL[category]}
              </Label>
            </div>
          )
        })}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-lg font-bold uppercase tracking-[0.1em]">Faixa de preço</legend>
        <div className="grid grid-cols-2 gap-3">
          <PriceField testId="filter-min-price" label="Mínimo" draft={min} />
          <PriceField testId="filter-max-price" label="Máximo" draft={max} />
        </div>
        <p className="text-sm text-muted-foreground">
          Preço: {min.draft || '0'} – {max.draft || 'sem limite'} ETH
        </p>
        <Button
          variant="outline"
          className="w-fit rounded-sm"
          disabled={min.invalid || max.invalid}
          onClick={applyPrice}
        >
          Aplicar
        </Button>
      </fieldset>

      <Field label="Disponibilidade" id="filter-availability">
        {(controlProps) => (
          <Select
            value={value.availability ?? 'all'}
            onValueChange={(v) => {
              const parsed = Availability.parse(v)
              onPatch({ availability: parsed === 'all' ? undefined : parsed })
            }}
          >
            <SelectTrigger {...controlProps} data-testid="filter-availability" className="rounded-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Availability.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {AVAILABILITY_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      {hasActiveFilters ? (
        <Button variant="outline" data-testid="catalog-clear-filters" className="rounded-sm" onClick={onClear}>
          Limpar filtros
        </Button>
      ) : null}
    </div>
  )
}

interface PriceDraft {
  draft: string
  setDraft: (value: string) => void
  invalid: boolean
  /** Valor normalizado para a URL (undefined = campo vazio). */
  value: string | undefined
  markSent: () => void
}

/**
 * Rascunho local do campo de preço: permite digitar "0." sem erro e só manda
 * para a URL quando forma um decimal válido, com debounce. "Aplicar" usa
 * `markSent` para mandar os dois campos numa única navegação.
 */
function usePriceDraft(urlValue: string | undefined, onCommit: (value: string | undefined) => void): PriceDraft {
  const current = urlValue ?? ''
  const [draft, setDraft] = React.useState(current)
  const lastSent = React.useRef(current)

  // A URL mudou por fora (voltar/limpar filtros): ressincroniza o rascunho.
  React.useEffect(() => {
    if (current !== lastSent.current) {
      lastSent.current = current
      setDraft(current)
    }
  }, [current])

  const normalized = draft.replace(',', '.')
  const invalid = draft !== '' && !ETH_VALID.test(normalized)
  const value = draft === '' ? undefined : normalized

  const markSent = React.useCallback(() => {
    lastSent.current = value ?? ''
  }, [value])

  React.useEffect(() => {
    if (invalid) return
    if ((value ?? '') === lastSent.current) return
    const timer = window.setTimeout(() => {
      if ((value ?? '') === lastSent.current) return
      lastSent.current = value ?? ''
      onCommit(value)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [invalid, value, onCommit])

  return { draft, setDraft, invalid, value, markSent }
}

function PriceField({ testId, label, draft }: { testId: string; label: string; draft: PriceDraft }) {
  return (
    <Field label={label} error={draft.invalid ? 'Use apenas números (ex.: 0.5)' : null}>
      <Input
        data-testid={testId}
        inputMode="decimal"
        autoComplete="off"
        className="h-11 rounded-sm"
        placeholder={label === 'Mínimo' ? '0' : '10'}
        value={draft.draft}
        onChange={(e) => {
          if (ETH_DRAFT.test(e.target.value)) draft.setDraft(e.target.value)
        }}
      />
    </Field>
  )
}

import * as React from 'react'
import { Availability, Category, CATEGORY_LABEL, type Category as CategoryType } from '@/contracts'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { CatalogSearch } from '../search'

const AVAILABILITY_LABEL: Record<Availability, string> = {
  all: 'Todos',
  available: 'Disponíveis',
  'sold-out': 'Esgotados',
}

const ETH_DRAFT = /^\d*([.,]\d*)?$/

export interface CatalogFiltersProps {
  value: CatalogSearch
  /** Controles discretos (categoria, disponibilidade): entram no histórico. */
  onPatch: (patch: Partial<CatalogSearch>) => void
  /** Campos digitados (preço): substituem a entrada atual para não poluir o histórico. */
  onPatchQuiet: (patch: Partial<CatalogSearch>) => void
  onClear: () => void
  hasActiveFilters: boolean
}

export function CatalogFilters({ value, onPatch, onPatchQuiet, onClear, hasActiveFilters }: CatalogFiltersProps) {
  const selected = value.category ?? []

  const toggleCategory = (category: CategoryType, checked: boolean) => {
    const next = checked ? [...selected, category] : selected.filter((c) => c !== category)
    onPatch({ category: next.length ? next : undefined })
  }

  return (
    <div data-testid="catalog-filters" className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold">Categorias</legend>
        {Category.options.map((category) => {
          const id = `filter-category-${category}`
          return (
            <div key={category} className="flex items-center gap-3">
              <Checkbox
                id={id}
                data-testid={id}
                checked={selected.includes(category)}
                onCheckedChange={(checked) => toggleCategory(category, checked === true)}
              />
              <Label htmlFor={id} className="font-normal">
                {CATEGORY_LABEL[category]}
              </Label>
            </div>
          )
        })}
      </fieldset>

      <Separator />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold">Faixa de preço (ETH)</legend>
        <div className="grid grid-cols-2 gap-3">
          <PriceField
            testId="filter-min-price"
            label="Mínimo"
            urlValue={value.minPrice}
            onCommit={(minPrice) => onPatchQuiet({ minPrice })}
          />
          <PriceField
            testId="filter-max-price"
            label="Máximo"
            urlValue={value.maxPrice}
            onCommit={(maxPrice) => onPatchQuiet({ maxPrice })}
          />
        </div>
      </fieldset>

      <Separator />

      <Field label="Disponibilidade" id="filter-availability">
        {(controlProps) => (
          <Select
            value={value.availability ?? 'all'}
            onValueChange={(v) => {
              const parsed = Availability.parse(v)
              onPatch({ availability: parsed === 'all' ? undefined : parsed })
            }}
          >
            <SelectTrigger {...controlProps} data-testid="filter-availability">
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
        <Button variant="outline" data-testid="catalog-clear-filters" onClick={onClear}>
          Limpar filtros
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Campo de preço: o rascunho é local (permite digitar "0." sem erro) e só vai
 * para a URL quando forma um decimal válido, com debounce.
 */
function PriceField({
  testId,
  label,
  urlValue,
  onCommit,
}: {
  testId: string
  label: string
  urlValue?: string
  onCommit: (value: string | undefined) => void
}) {
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
  const invalid = draft !== '' && !/^\d+(\.\d+)?$/.test(normalized)

  React.useEffect(() => {
    if (!ETH_DRAFT.test(draft)) return
    const next = draft === '' ? undefined : normalized
    if (draft !== '' && invalid) return
    if ((next ?? '') === lastSent.current) return
    const timer = window.setTimeout(() => {
      lastSent.current = next ?? ''
      onCommit(next)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [draft, normalized, invalid, onCommit])

  return (
    <Field label={label} error={invalid ? 'Use apenas números (ex.: 0.5)' : null}>
      <Input
        data-testid={testId}
        inputMode="decimal"
        autoComplete="off"
        placeholder={label === 'Mínimo' ? '0' : '10'}
        value={draft}
        onChange={(e) => {
          if (ETH_DRAFT.test(e.target.value)) setDraft(e.target.value)
        }}
      />
    </Field>
  )
}

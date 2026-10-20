import * as React from 'react'
import { Availability, Category, CATEGORY_LABEL, type Category as CategoryType } from '@/contracts'
import { formatEth } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { useCatalogFacets } from '../hooks'
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
 * Barra lateral do Figma (310px, gap 24px): Coleções com contagem, Faixa de
 * preço com slider e Disponibilidade. As contagens e os limites do slider vêm
 * de `GET /nfts/facets`, agregado no mock a partir do catálogo real — nunca
 * número inventado em componente.
 */
export function CatalogFilters({ value, onPatch, onPatchQuiet, onClear, hasActiveFilters }: CatalogFiltersProps) {
  const selected = value.category ?? []
  const facets = useCatalogFacets()

  const toggleCategory = (category: CategoryType, checked: boolean) => {
    const next = checked ? [...selected, category] : selected.filter((c) => c !== category)
    onPatch({ category: next.length ? next : undefined })
  }

  return (
    <div data-testid="catalog-filters" className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-3 text-lg font-bold uppercase tracking-[0.1em]">Coleções</legend>
        {Category.options.map((category) => {
          const id = `filter-category-${category}`
          const count = facets.data?.category[category]
          return (
            <div key={category} className="flex min-h-9 items-center justify-between gap-3">
              <div className="flex items-center gap-3">
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
              {facets.isPending ? (
                <Skeleton className="h-4 w-6" />
              ) : count !== undefined ? (
                <span aria-hidden="true" className="text-sm text-muted-foreground">
                  ({count})
                </span>
              ) : null}
            </div>
          )
        })}
      </fieldset>

      <PriceRangeFilter value={value} onPatchQuiet={onPatchQuiet} facetMin={facets.data?.priceRange.min} facetMax={facets.data?.priceRange.max} />

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

interface PriceRangeFilterProps {
  value: CatalogSearch
  onPatchQuiet: (patch: Partial<CatalogSearch>) => void
  /** Limites reais do catálogo inteiro, vindos de /nfts/facets. */
  facetMin?: string
  facetMax?: string
}

/**
 * Slider de dois cursores (Radix, operável por teclado) acoplado aos dois
 * campos numéricos — os campos continuam existindo porque digitar um valor
 * exato é mais confiável que arrastar, e os dois controles ficam sincronizados.
 */
function PriceRangeFilter({ value, onPatchQuiet, facetMin, facetMax }: PriceRangeFilterProps) {
  const min = usePriceDraft(value.minPrice, (minPrice) => onPatchQuiet({ minPrice }))
  const max = usePriceDraft(value.maxPrice, (maxPrice) => onPatchQuiet({ maxPrice }))

  const bounds = facetMin !== undefined && facetMax !== undefined ? { lo: Number(facetMin), hi: Math.max(Number(facetMax), Number(facetMin) + 0.01) } : null

  const sliderValue: [number, number] | null = bounds
    ? [min.invalid || !min.value ? bounds.lo : Math.max(bounds.lo, Number(min.value)), max.invalid || !max.value ? bounds.hi : Math.min(bounds.hi, Number(max.value))]
    : null

  const applyPrice = () => {
    if (min.invalid || max.invalid) return
    min.markSent()
    max.markSent()
    onPatchQuiet({ minPrice: min.value, maxPrice: max.value })
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-lg font-bold uppercase tracking-[0.1em]">Faixa de preço</legend>

      {bounds && sliderValue ? (
        <Slider
          aria-label="Faixa de preço em ETH"
          data-testid="filter-price-slider"
          min={bounds.lo}
          max={bounds.hi}
          step={0.01}
          value={sliderValue}
          onValueChange={([lo, hi]) => {
            min.setDraft(lo.toFixed(2))
            max.setDraft(hi.toFixed(2))
          }}
          onValueCommit={() => applyPrice()}
          className="mt-1"
        />
      ) : (
        <Skeleton className="h-6 w-full" />
      )}

      <div className="grid grid-cols-2 gap-3">
        <PriceField testId="filter-min-price" label="Mínimo" draft={min} />
        <PriceField testId="filter-max-price" label="Máximo" draft={max} />
      </div>
      <p className="text-sm text-muted-foreground">
        Preço: {min.draft || (bounds ? formatEth(String(bounds.lo), { withUnit: false }) : '0')} –{' '}
        {max.draft || (bounds ? formatEth(String(bounds.hi), { withUnit: false }) : 'sem limite')} ETH
      </p>
      <Button variant="outline" className="w-fit rounded-sm" disabled={min.invalid || max.invalid} onClick={applyPrice}>
        Aplicar
      </Button>
    </fieldset>
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

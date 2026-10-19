import { X } from 'lucide-react'
import { CATEGORY_LABEL, NFT_SORT_LABEL } from '@/contracts'
import { formatEth } from '@/lib/money'
import type { CatalogSearch } from '../search'

export interface ActiveFilterChipsProps {
  value: CatalogSearch
  onPatch: (patch: Partial<CatalogSearch>) => void
}

/** Filtros ativos como chips removíveis: deixa visível o que está restringindo a lista. */
export function ActiveFilterChips({ value, onPatch }: ActiveFilterChipsProps) {
  const chips: { key: string; label: string; remove: () => void }[] = []

  if (value.q) chips.push({ key: 'q', label: `Busca: ${value.q}`, remove: () => onPatch({ q: undefined }) })

  for (const category of value.category ?? []) {
    chips.push({
      key: `category-${category}`,
      label: CATEGORY_LABEL[category],
      remove: () => {
        const next = (value.category ?? []).filter((c) => c !== category)
        onPatch({ category: next.length ? next : undefined })
      },
    })
  }

  if (value.minPrice)
    chips.push({ key: 'minPrice', label: `A partir de ${formatEth(value.minPrice)}`, remove: () => onPatch({ minPrice: undefined }) })
  if (value.maxPrice)
    chips.push({ key: 'maxPrice', label: `Até ${formatEth(value.maxPrice)}`, remove: () => onPatch({ maxPrice: undefined }) })
  if (value.availability && value.availability !== 'all')
    chips.push({
      key: 'availability',
      label: value.availability === 'available' ? 'Disponíveis' : 'Esgotados',
      remove: () => onPatch({ availability: undefined }),
    })
  if (value.sort && value.sort !== 'recent')
    chips.push({ key: 'sort', label: NFT_SORT_LABEL[value.sort], remove: () => onPatch({ sort: undefined }) })

  if (chips.length === 0) return null

  return (
    <ul aria-label="Filtros ativos" className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={chip.remove}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1 text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {chip.label}
            <X aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Remover filtro</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

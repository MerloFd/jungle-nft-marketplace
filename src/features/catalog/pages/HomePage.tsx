import * as React from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { SlidersHorizontal } from 'lucide-react'
import { NFT_SORT_LABEL, NftSort } from '@/contracts'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Field } from '@/components/ui/field'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { UpdatingIndicator } from '@/components/ui/updating-indicator'
import { PageContainer } from '@/components/layout/PageContainer'
import { ActiveFilterChips } from '../components/ActiveFilterChips'
import { CatalogFilters } from '../components/CatalogFilters'
import { CatalogSearchField } from '../components/CatalogSearchField'
import { FeaturedSection } from '../components/FeaturedSection'
import { NftCard, NftCardSkeleton } from '../components/NftCard'
import { useMediaQuery, useNftList } from '../hooks'
import { CATALOG_PAGE_SIZE, type CatalogSearch } from '../search'

export function HomePage() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [filtersOpen, setFiltersOpen] = React.useState(false)

  /**
   * Qualquer mudança de busca/filtro/ordenação volta para a primeira página
   * (`page` é removido da URL em vez de virar 1, para o link ficar limpo).
   * `replace: false` (push) em controles discretos: o botão voltar restaura o
   * estado anterior. `replace: true` nos campos digitados (busca e preço),
   * que senão criariam uma entrada de histórico por tecla.
   */
  const patchWith = React.useCallback(
    (patch: Partial<CatalogSearch>, replace: boolean) => {
      void navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }), replace })
    },
    [navigate],
  )

  const patch = React.useCallback((p: Partial<CatalogSearch>) => patchWith(p, false), [patchWith])
  const patchQuiet = React.useCallback((p: Partial<CatalogSearch>) => patchWith(p, true), [patchWith])
  const clearFilters = React.useCallback(() => {
    void navigate({ search: {}, replace: false })
  }, [navigate])

  const hasActiveFilters = Boolean(
    search.q ||
      search.category?.length ||
      search.minPrice ||
      search.maxPrice ||
      (search.availability && search.availability !== 'all') ||
      (search.sort && search.sort !== 'recent'),
  )

  const { data, isPending, isError, isFetching, refetch } = useNftList(search)
  const page = data?.page ?? search.page ?? 1
  const totalPages = data?.totalPages ?? 1

  const filters = (
    <CatalogFilters
      value={search}
      onPatch={patch}
      onPatchQuiet={patchQuiet}
      onClear={clearFilters}
      hasActiveFilters={hasActiveFilters}
    />
  )

  return (
    <PageContainer className="flex flex-col gap-12 py-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold leading-tight md:text-5xl">
          Descubra, colecione e venda <span className="text-accent-text">NFTs extraordinários</span>
        </h1>
        <p className="max-w-2xl text-muted-foreground md:text-lg">
          Explore o catálogo completo, filtre por categoria e preço e acompanhe as mudanças de preço e estoque em tempo real.
        </p>
      </section>

      <FeaturedSection />

      <section aria-labelledby="catalog-title" className="flex flex-col gap-6">
        <h2 id="catalog-title" className="text-2xl font-semibold">
          Catálogo
        </h2>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <CatalogSearchField value={search.q ?? ''} onCommit={(q) => patchQuiet({ q })} />

          <div className="flex items-start gap-3">
            <Field label="Ordenar por" id="catalog-sort" className="min-w-[200px]">
              {(controlProps) => (
                <Select
                  value={search.sort ?? 'recent'}
                  onValueChange={(v) => {
                    const parsed = NftSort.parse(v)
                    patch({ sort: parsed === 'recent' ? undefined : parsed })
                  }}
                >
                  <SelectTrigger {...controlProps} data-testid="catalog-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NftSort.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {NFT_SORT_LABEL[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            {!isDesktop ? (
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="mt-7">
                    <SlidersHorizontal aria-hidden="true" />
                    Filtros
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" aria-label="Filtros do catálogo">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>
                  {filters}
                  <Button onClick={() => setFiltersOpen(false)}>Ver resultados</Button>
                </SheetContent>
              </Sheet>
            ) : null}
          </div>
        </div>

        <ActiveFilterChips value={search} onPatch={patch} />

        <div className="flex flex-col gap-8 lg:flex-row">
          {isDesktop ? (
            <aside aria-label="Filtros do catálogo" className="w-[260px] shrink-0">
              {filters}
            </aside>
          ) : null}

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p data-testid="catalog-total" className="text-sm text-muted-foreground" aria-live="polite">
                {isPending ? 'Buscando NFTs…' : formatTotal(data?.total ?? 0)}
              </p>
              <UpdatingIndicator active={isFetching && !isPending} id="catalog" />
            </div>

            {isPending ? (
              <div data-testid="catalog-skeleton" className={GRID_CLASS}>
                {Array.from({ length: CATALOG_PAGE_SIZE }, (_, i) => (
                  <NftCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <div data-testid="catalog-error">
                <ErrorState
                  title="Não foi possível carregar o catálogo"
                  description="Houve uma falha ao consultar os NFTs. Tente novamente."
                  onRetry={() => void refetch()}
                  retrying={isFetching}
                />
              </div>
            ) : data.items.length === 0 ? (
              <div data-testid="catalog-empty">
                <EmptyState
                  title="Nenhum NFT encontrado"
                  description="Nenhum item corresponde à sua busca e aos filtros selecionados."
                  action={
                    hasActiveFilters ? (
                      <Button variant="outline" onClick={clearFilters}>
                        Limpar filtros
                      </Button>
                    ) : null
                  }
                />
              </div>
            ) : (
              <>
                <ul data-testid="catalog" className={GRID_CLASS}>
                  {data.items.map((nft) => (
                    <li key={nft.id}>
                      <NftCard nft={nft} />
                    </li>
                  ))}
                </ul>

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  // Links reais: paginação navegável por teclado, abre em nova aba e entra no histórico.
                  renderLink={(target, props) => (
                    <Link to="/" search={(prev) => ({ ...prev, page: target === 1 ? undefined : target })} {...props} />
                  )}
                />
              </>
            )}
          </div>
        </div>
      </section>
    </PageContainer>
  )
}

const GRID_CLASS = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'

function formatTotal(total: number) {
  return total === 1 ? '1 NFT encontrado' : `${total} NFTs encontrados`
}

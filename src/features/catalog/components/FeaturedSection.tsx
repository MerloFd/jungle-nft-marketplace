import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { useFeaturedNfts } from '../hooks'
import { NftCard, NftCardSkeleton } from './NftCard'

/**
 * Faixa de destaques. Rola horizontalmente no mobile (scroll-snap) e vira
 * grade no desktop — sem overflow da página em 390px.
 */
export function FeaturedSection() {
  const { data, isPending, isError, refetch, isFetching } = useFeaturedNfts()

  return (
    <section aria-labelledby="featured-title" className="flex flex-col gap-4">
      <h2 id="featured-title" className="text-2xl font-semibold">
        Destaques da semana
      </h2>

      {isPending ? (
        <div data-testid="featured-skeleton" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <NftCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div data-testid="featured-error">
          <ErrorState
            title="Não foi possível carregar os destaques"
            description="Os destaques não responderam. Você pode tentar novamente."
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState title="Nenhum destaque no momento" description="Confira o catálogo completo abaixo." />
      ) : (
        <ul
          data-testid="featured"
          className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {data.items.slice(0, 8).map((nft) => (
            <li key={nft.id} className="w-[260px] shrink-0 snap-start lg:w-auto">
              <NftCard nft={nft} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

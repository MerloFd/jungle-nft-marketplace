import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useFeaturedNfts } from '../hooks'

const SLOTS = 3

/**
 * Hero do Figma: sobretítulo, H1 em caixa alta, parágrafo, botão EXPLORAR e as
 * bolinhas do carrossel. A imagem à direita é o NFT em destaque vindo de
 * `/api/nfts/featured`, e as bolinhas trocam de destaque de verdade.
 */
export function HomeHero() {
  const { data, isPending, isError, refetch, isFetching } = useFeaturedNfts()
  const [slot, setSlot] = React.useState(0)

  const items = (data?.items ?? []).slice(0, SLOTS)
  const index = Math.min(slot, Math.max(0, items.length - 1))
  const current = items[index]

  return (
    <section aria-labelledby="hero-title" className="grid gap-8 lg:grid-cols-[600px_minmax(0,1fr)] lg:items-center">
      <div className="flex flex-col gap-6">
        <p className="text-sm font-medium leading-4 tracking-[0.1em]">Bem-vindo à Kurio</p>

        <h1 id="hero-title" className="max-w-[600px] text-3xl font-bold uppercase leading-tight lg:text-[2.6875rem] lg:leading-[4.375rem]">
          Seja dono do futuro da arte digital
        </h1>

        <p className="max-w-[557px] text-sm leading-6 text-muted-foreground">
          Explore coleções selecionadas, filtre por categoria, preço e disponibilidade e acompanhe as mudanças de preço
          e de estoque em tempo real.
        </p>

        <a
          href="#catalogo"
          className="inline-flex h-11 w-fit items-center rounded-sm bg-primary px-8 text-base font-bold uppercase tracking-[0.05em] text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Explorar
        </a>

        {items.length > 1 ? (
          <ul className="flex items-center gap-3" aria-label="Destaques">
            {items.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-controls="hero-showcase"
                  aria-current={i === index ? 'true' : undefined}
                  aria-label={`Ver destaque ${i + 1} de ${items.length}: ${item.name}`}
                  onClick={() => setSlot(i)}
                  className={cn(
                    'size-3 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    i === index ? 'bg-primary' : 'bg-border-strong/40 hover:bg-border-strong',
                  )}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div id="hero-showcase" className="min-w-0">
        {isPending ? (
          <div data-testid="featured-skeleton">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          </div>
        ) : isError ? (
          <div data-testid="featured-error">
            <ErrorState
              title="Não foi possível carregar os destaques"
              description="Os destaques não responderam. O catálogo abaixo continua disponível."
              onRetry={() => void refetch()}
              retrying={isFetching}
            />
          </div>
        ) : current ? (
          <div data-testid="featured" className="flex flex-col gap-3">
            <Link
              to="/nft/$nftId"
              params={{ nftId: current.id }}
              className="group block overflow-hidden rounded-xl bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <img
                src={current.image}
                alt={current.imageAlt}
                width={568}
                height={426}
                decoding="async"
                className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]"
              />
            </Link>
            <p className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-base font-medium">{current.name}</span>
              <span className="text-lg font-bold text-accent-text">{formatEth(current.floorPriceEth)}</span>
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}

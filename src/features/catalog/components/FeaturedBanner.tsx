import { Link } from '@tanstack/react-router'
import { formatEth } from '@/lib/money'
import { useFeaturedNfts } from '../hooks'

/**
 * Banner "NFT em destaque" da barra lateral do Figma. Usa o último item de
 * `/api/nfts/featured` (o hero mostra os primeiros), então nada aqui é fictício.
 * Os estados de carregamento e erro dos destaques ficam no hero, que é o bloco
 * principal: aqui o banner simplesmente não aparece sem dados.
 */
export function FeaturedBanner() {
  const { data } = useFeaturedNfts()
  const item = data?.items.at(-1)
  if (!item) return null

  return (
    <section aria-labelledby="featured-banner-title" className="flex flex-col gap-3 rounded-xl bg-card p-4">
      <h2 id="featured-banner-title" className="text-base font-bold uppercase tracking-[0.1em]">
        NFT em destaque
      </h2>
      <p className="text-xs uppercase tracking-[0.2em] text-accent-text">Oferta limitada</p>

      <Link
        to="/nft/$nftId"
        params={{ nftId: item.id }}
        className="group flex flex-col gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <img
          src={item.image}
          alt={item.imageAlt}
          width={278}
          height={208}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full rounded-xl object-cover"
        />
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-base font-medium group-hover:text-accent-text">{item.name}</span>
          <span className="shrink-0 text-lg font-bold text-accent-text">{formatEth(item.floorPriceEth)}</span>
        </span>
      </Link>
    </section>
  )
}

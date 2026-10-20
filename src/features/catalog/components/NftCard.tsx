import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/contracts'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export interface NftCardProps {
  nft: NftSummary
  className?: string
}

/**
 * Cartão do catálogo (Figma: 258×300, imagem 250×250 com raio 15px, nome 16
 * medium e preço 18 bold em text-accent). O cartão INTEIRO é um único link
 * (sem links aninhados), então a navegação funciona com um só Tab por item.
 */
export function NftCard({ nft, className }: NftCardProps) {
  const soldOut = nft.available === 0
  return (
    <Link
      to="/nft/$nftId"
      params={{ nftId: nft.id }}
      data-testid={`nft-card-${nft.id}`}
      className={cn(
        'group flex h-full flex-col gap-2 rounded-xl bg-card p-1 text-card-foreground transition-colors',
        'hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        <img
          src={nft.image}
          alt={nft.imageAlt}
          width={250}
          height={250}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
        {soldOut ? (
          <Badge variant="destructive" className="absolute left-2 top-2">
            Esgotado
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-1 items-end justify-between gap-2 px-2 pb-2">
        <h3 className="min-w-0 break-words text-base font-medium leading-5">{nft.name}</h3>
        <span className="shrink-0 text-lg font-bold leading-5 text-accent-text">{formatEth(nft.floorPriceEth)}</span>
      </div>
    </Link>
  )
}

/** Mesmas dimensões do cartão real (imagem quadrada + linha de nome/preço). */
export function NftCardSkeleton() {
  return (
    <div className="flex h-full flex-col gap-2 rounded-xl bg-card p-1">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="flex flex-1 items-end justify-between gap-2 px-2 pb-2">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  )
}

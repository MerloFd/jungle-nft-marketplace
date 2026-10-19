import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/contracts'
import { CATEGORY_LABEL } from '@/contracts'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export interface NftCardProps {
  nft: NftSummary
  className?: string
}

/**
 * Cartão do catálogo. O cartão INTEIRO é um único link (sem links aninhados),
 * então a navegação funciona por teclado com um só Tab por item.
 */
export function NftCard({ nft, className }: NftCardProps) {
  const soldOut = nft.available === 0
  return (
    <Link
      to="/nft/$nftId"
      params={{ nftId: nft.id }}
      data-testid={`nft-card-${nft.id}`}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-xl bg-card text-card-foreground transition-colors',
        'hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <img
          src={nft.image}
          alt={nft.imageAlt}
          width={400}
          height={400}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
        {soldOut ? (
          <Badge variant="destructive" className="absolute left-3 top-3">
            Esgotado
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold leading-tight">{nft.name}</h3>
          <p className="text-sm text-muted-foreground">{nft.collectionName}</p>
        </div>

        <div className="flex items-center gap-2">
          <img
            src={nft.creator.avatarUrl}
            alt=""
            width={24}
            height={24}
            loading="lazy"
            className="size-6 shrink-0 rounded-full bg-muted object-cover"
          />
          <span className="truncate text-sm text-muted-foreground">{nft.creator.name}</span>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-2">
          <span className="text-xs text-muted-foreground">{CATEGORY_LABEL[nft.category]}</span>
          <span className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground">Preço mínimo</span>
            <span className="font-mono text-base font-semibold text-accent-text">{formatEth(nft.floorPriceEth)}</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

/** Mesmas dimensões do cartão real (imagem quadrada + 4 linhas) para não haver layout shift. */
export function NftCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-card">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="mt-auto flex items-end justify-between gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  )
}

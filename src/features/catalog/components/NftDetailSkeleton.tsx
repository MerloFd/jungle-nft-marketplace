import { Skeleton } from '@/components/ui/skeleton'

/** Mesma estrutura do detalhe real (galeria quadrada + coluna de informações). */
export function NftDetailSkeleton() {
  return (
    <div data-testid="nft-detail-skeleton" className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="flex gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="size-20 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-20 w-full" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-[220px]" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  )
}

import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Info, ShoppingCart } from 'lucide-react'
import { CATEGORY_LABEL, NETWORK_LABEL, type Edition, type NftDetail, type NftUpdatedEvent } from '@/contracts'
import { isApiError } from '@/lib/http'
import { eth, formatEth } from '@/lib/money'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { useAnnounce } from '@/components/ui/live-region'
import { toast } from '@/components/ui/toaster'
import { UpdatingIndicator } from '@/components/ui/updating-indicator'
import { PageContainer } from '@/components/layout/PageContainer'
import { useAddToCart } from '@/features/cart/hooks'
import { useRealtimeEvent } from '@/realtime/RealtimeProvider'
import { EditionPicker } from '../components/EditionPicker'
import { FavoriteToggle } from '../components/FavoriteToggle'
import { NftDetailSkeleton } from '../components/NftDetailSkeleton'
import { NftGallery } from '../components/NftGallery'
import { QuantityStepper } from '../components/QuantityStepper'
import { isNotFoundError, useNftDetail } from '../hooks'

export function NftDetailPage() {
  const { nftId } = useParams({ from: '/nft/$nftId' })
  const { data, isPending, isError, error, isFetching, refetch } = useNftDetail(nftId)

  if (isPending) {
    return (
      <PageContainer className="py-10">
        <NftDetailSkeleton />
      </PageContainer>
    )
  }

  if (isNotFoundError(error)) {
    return (
      <PageContainer className="py-16">
        <div data-testid="nft-detail-not-found">
          <h1 className="sr-only">NFT não encontrado</h1>
          <EmptyState
            title="NFT não encontrado"
            description="Este NFT não existe ou saiu do catálogo."
            action={
              <Button asChild variant="outline">
                <Link to="/">
                  <ArrowLeft aria-hidden="true" />
                  Voltar para o catálogo
                </Link>
              </Button>
            }
          />
        </div>
      </PageContainer>
    )
  }

  if (isError) {
    return (
      <PageContainer className="py-16">
        <h1 className="sr-only">Erro ao carregar o NFT</h1>
        <div data-testid="nft-detail-error">
          <ErrorState
            title="Não foi possível carregar este NFT"
            description="Houve uma falha na consulta. Tente novamente."
            onRetry={() => void refetch()}
            retrying={isFetching}
          />
        </div>
      </PageContainer>
    )
  }

  return <NftDetailContent nft={data} isFetching={isFetching} />
}

function NftDetailContent({ nft, isFetching }: { nft: NftDetail; isFetching: boolean }) {
  const announce = useAnnounce()
  const navigate = useNavigate()
  const addToCart = useAddToCart()

  const [editionId, setEditionId] = React.useState<string | null>(null)
  const [quantity, setQuantity] = React.useState(1)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [addedQuantity, setAddedQuantity] = React.useState(0)

  // Edição escolhida (ou a primeira com unidades) derivada do dado atual:
  // quando o socket atualiza o NFT, tudo se reajusta sozinho.
  const selected = React.useMemo(
    () => nft.editions.find((e) => e.id === editionId) ?? nft.editions.find((e) => e.available > 0) ?? nft.editions[0],
    [nft.editions, editionId],
  )
  const allSoldOut = nft.editions.every((e) => e.available === 0)
  const limit = editionLimit(selected)
  const effectiveQuantity = Math.min(Math.max(1, quantity), Math.max(1, limit))

  // Refs com os valores vistos ANTES do evento: o barramento dispara depois de
  // atualizar o cache, mas antes do próximo render.
  const selectedRef = React.useRef(selected)
  const quantityRef = React.useRef(effectiveQuantity)
  const floorRef = React.useRef(nft.floorPriceEth)
  React.useEffect(() => {
    selectedRef.current = selected
    quantityRef.current = effectiveQuantity
    floorRef.current = nft.floorPriceEth
  })

  const onNftUpdated = React.useCallback(
    (event: NftUpdatedEvent) => {
      if (event.data.nftId !== nft.id) return
      const previous = selectedRef.current
      const messages: string[] = []

      const updated = previous ? event.data.editions.find((e) => e.id === previous.id) : undefined
      if (previous && updated) {
        if (eth.cmp(updated.priceEth, previous.priceEth) !== 0) {
          messages.push(
            `O preço da edição ${previous.name} mudou de ${formatEth(previous.priceEth)} para ${formatEth(updated.priceEth)}.`,
          )
        }
        if (updated.available === 0 && previous.available > 0) {
          messages.push(`A edição ${previous.name} esgotou.`)
        } else {
          const newLimit = Math.min(updated.available, previous.maxPerOrder)
          if (newLimit > 0 && quantityRef.current > newLimit) {
            setQuantity(newLimit)
            messages.push(`A quantidade foi ajustada para ${newLimit}.`)
          }
        }
      }

      if (messages.length === 0 && eth.cmp(event.data.floorPriceEth, floorRef.current) !== 0) {
        messages.push(`O preço mínimo mudou para ${formatEth(event.data.floorPriceEth)}.`)
      }
      if (messages.length === 0) messages.push('Este NFT acabou de ser atualizado.')

      const message = messages.join(' ')
      setNotice(message)
      announce(message, 'assertive')
    },
    [nft.id, announce],
  )

  // O cache já é atualizado pelo cliente de tempo real: aqui só reagimos ao aviso.
  useRealtimeEvent('nft.updated', onNftUpdated)

  const onSelectEdition = (id: string) => {
    setEditionId(id)
    const next = nft.editions.find((e) => e.id === id)
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, editionLimit(next))))
    setAddedQuantity(0)
  }

  const onAddToCart = () => {
    if (!selected || limit === 0) return
    addToCart.mutate(
      { nftId: nft.id, editionId: selected.id, quantity: effectiveQuantity },
      {
        onSuccess: () => {
          setAddedQuantity(effectiveQuantity)
          const message = `${effectiveQuantity} ${effectiveQuantity === 1 ? 'unidade' : 'unidades'} de ${nft.name} (${selected.name}) ${effectiveQuantity === 1 ? 'adicionada' : 'adicionadas'} ao carrinho`
          announce(message)
          toast.success(message, {
            action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/cart' }) },
          })
        },
        onError: (error) => {
          const message = addToCartMessage(error)
          toast.error(message)
          announce(message, 'assertive')
        },
      },
    )
  }

  return (
    <PageContainer className="flex flex-col gap-8 py-10">
      <Link to="/" className="inline-flex w-fit items-center gap-2 text-accent-text hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar para o catálogo
      </Link>

      <article data-testid="nft-detail" className="grid gap-8 lg:grid-cols-2">
        <NftGallery images={nft.images} />

        <div className="flex min-w-0 flex-col gap-6">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{CATEGORY_LABEL[nft.category]}</Badge>
              {allSoldOut ? <Badge variant="destructive">Esgotado</Badge> : null}
              <UpdatingIndicator active={isFetching} id="nft-detail" />
            </div>
            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">{nft.name}</h1>
            <p className="text-muted-foreground">{nft.collectionName}</p>
            <div className="flex items-center gap-3">
              <img
                src={nft.creator.avatarUrl}
                alt=""
                width={40}
                height={40}
                className="size-10 rounded-full bg-muted object-cover"
              />
              <span className="flex flex-col">
                <span className="text-xs text-muted-foreground">Criado por</span>
                <span className="font-semibold">{nft.creator.name}</span>
              </span>
            </div>
          </header>

          {notice ? (
            <div
              data-testid="nft-updated-notice"
              role="status"
              className="flex items-start gap-3 rounded-xl border border-warning/60 bg-warning/15 p-4 text-sm"
            >
              <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning-text" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-foreground">{notice}</p>
                <Button variant="ghost" size="sm" className="w-fit" onClick={() => setNotice(null)}>
                  Entendi
                </Button>
              </div>
            </div>
          ) : null}

          <p className="text-muted-foreground">{nft.description}</p>

          <EditionPicker editions={nft.editions} selectedId={selected?.id ?? ''} onSelect={onSelectEdition} />

          <QuantityStepper
            value={effectiveQuantity}
            max={limit}
            limitReason={selected && selected.available < selected.maxPerOrder ? 'stock' : 'per-order'}
            onChange={(next) => setQuantity(Math.min(Math.max(1, next), Math.max(1, limit)))}
            disabled={limit === 0}
          />

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                data-testid="add-to-cart"
                size="lg"
                className="flex-1 sm:flex-none"
                disabled={allSoldOut || limit === 0}
                loading={addToCart.isPending}
                onClick={onAddToCart}
              >
                <ShoppingCart aria-hidden="true" />
                Adicionar ao carrinho
              </Button>
              <FavoriteToggle nftId={nft.id} nftName={nft.name} favoritesCount={nft.favoritesCount} />
            </div>

            {allSoldOut ? (
              <p className="text-sm text-muted-foreground">
                Todas as edições estão esgotadas. Acompanhe esta página: o estoque é atualizado em tempo real.
              </p>
            ) : limit === 0 ? (
              <p className="text-sm text-muted-foreground">Esta edição está esgotada. Escolha outra edição para comprar.</p>
            ) : selected ? (
              <p className="text-sm text-muted-foreground">
                Total estimado:{' '}
                <span className="font-mono font-semibold text-foreground">
                  {formatEth(eth.mul(selected.priceEth, effectiveQuantity))}
                </span>
              </p>
            ) : null}

            {addedQuantity > 0 ? (
              <Link to="/cart" className="w-fit text-accent-text hover:underline">
                Ver carrinho
              </Link>
            ) : null}
          </div>

          {nft.tags.length > 0 ? (
            <section aria-labelledby="nft-tags" className="flex flex-col gap-2">
              <h2 id="nft-tags" className="text-lg font-semibold">
                Tags
              </h2>
              <ul className="flex flex-wrap gap-2">
                {nft.tags.map((tag) => (
                  <li key={tag}>
                    <Badge variant="outline">{tag}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="nft-specs" className="flex flex-col gap-3">
            <h2 id="nft-specs" className="text-lg font-semibold">
              Detalhes do token
            </h2>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Spec label="Rede" value={NETWORK_LABEL[nft.network]} />
              <Spec label="Padrão" value={nft.tokenStandard} />
              <Spec label="Favoritos" value={String(nft.favoritesCount)} />
              <Spec label="Contrato" value={nft.contractAddress} mono />
            </dl>
          </section>
        </div>
      </article>
    </PageContainer>
  )
}

function Spec({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? 'truncate font-mono text-sm' : 'text-sm'}>{value}</dd>
    </div>
  )
}

function editionLimit(edition: Edition | undefined) {
  return edition ? Math.min(edition.available, edition.maxPerOrder) : 0
}

/** Erros de negócio do carrinho viram mensagem específica; o resto cai no texto da API. */
function addToCartMessage(error: unknown) {
  if (isApiError(error)) {
    switch (error.code) {
      case 'OUT_OF_STOCK':
        return 'Não há unidades suficientes desta edição. Reduza a quantidade ou escolha outra edição.'
      case 'QUANTITY_LIMIT':
        return 'A quantidade escolhida passa do limite por pedido desta edição.'
      case 'EDITION_UNAVAILABLE':
        return 'Esta edição não está mais disponível para compra.'
      default:
        return error.message
    }
  }
  return 'Não foi possível adicionar ao carrinho. Tente novamente.'
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { BuyerInfo, NETWORK_LABEL, type Network, type Order } from '@/contracts'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnnounce } from '@/components/ui/live-region'
import { useRealtimeEvent } from '@/realtime/RealtimeProvider'
import { useCart, useSetCartNetwork } from '@/features/cart/hooks'
import { useWallets } from '@/features/account/hooks'
import { BuyerStep } from '../components/BuyerStep'
import { CheckoutSteps, STEP_ORDER, type CheckoutStep } from '../components/CheckoutSteps'
import { ReviewStep } from '../components/ReviewStep'
import { WalletStep } from '../components/WalletStep'
import { useCheckoutOrder, useQuoteFlow } from '../hooks'
import { attemptStore, buyerDraftStore, emptyBuyerDraft, networkStore } from '../storage'

function readBuyerDraft() {
  const draft = buyerDraftStore.get() ?? emptyBuyerDraft
  const parsed = BuyerInfo.safeParse(draft)
  return { draft, buyer: parsed.success ? parsed.data : null }
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const announce = useAnnounce()
  const cart = useCart()
  const wallets = useWallets()
  const setCartNetwork = useSetCartNetwork()

  // Rascunho em sessionStorage: refresh ou desvio para o login não perdem o fluxo.
  const [initialDraft] = useState(readBuyerDraft)
  const [buyer, setBuyer] = useState<BuyerInfo | null>(initialDraft.buyer)
  const [step, setStep] = useState<CheckoutStep>(initialDraft.buyer ? 'wallet' : 'buyer')
  const [walletId, setWalletId] = useState<string | null>(null)
  const [network, setNetwork] = useState<Network>(() => networkStore.get() ?? 'ethereum')
  const [walletLost, setWalletLost] = useState<string | null>(null)

  const quoteFlow = useQuoteFlow()
  const { ensure, reset: resetQuote, revalidate, needsAcceptance } = quoteFlow

  const onPlaced = useCallback(
    (order: Order) => {
      // Não dizemos "confirmado" aqui: a página do pedido mostra o status da API.
      void navigate({ to: '/orders/$orderId', params: { orderId: order.id }, replace: true })
    },
    [navigate],
  )

  const onWalletLost = useCallback(
    (message: string) => {
      setWalletLost(message)
      setStep('wallet')
      announce('A conexão da carteira caiu. Conecte novamente para confirmar a compra.', 'assertive')
    },
    [announce],
  )

  const placement = useCheckoutOrder({ quoteFlow, onPlaced, onWalletLost })
  const { probeAttempt } = placement

  // Recuperação: se existe uma tentativa guardada (timeout, refresh, login no
  // meio do fluxo), o pedido pode já existir no servidor. Perguntamos antes de
  // deixar o usuário comprar de novo.
  const probed = useRef(false)
  useEffect(() => {
    if (probed.current) return
    probed.current = true
    void probeAttempt().then((order) => {
      if (!order) return
      // Pedido em andamento: levamos o usuário até ele em vez de deixar comprar
      // de novo. Já finalizado: a tentativa morreu, a chave não serve mais.
      if (order.status === 'pending') onPlaced(order)
      else attemptStore.clear()
    })
  }, [probeAttempt, onPlaced])

  // Rede inicial: a mesma do carrinho (é ela que define a taxa já exibida lá).
  const cartNetwork = cart.data?.network
  const networkTouched = useRef(networkStore.get() !== null)
  useEffect(() => {
    if (networkTouched.current || !cartNetwork) return
    networkTouched.current = true
    setNetwork(cartNetwork)
  }, [cartNetwork])

  // Carteira principal pré-selecionada (a API devolve a principal primeiro).
  const walletList = wallets.data
  useEffect(() => {
    if (walletId || !walletList?.length) return
    setWalletId(walletList[0].id)
  }, [walletId, walletList])

  const selectedWallet = useMemo(() => walletList?.find((w) => w.id === walletId) ?? null, [walletList, walletId])

  // A rede precisa ser suportada pela carteira escolhida.
  useEffect(() => {
    if (!selectedWallet || selectedWallet.networks.includes(network)) return
    const fallback = selectedWallet.networks[0]
    setNetwork(fallback)
    networkStore.set(fallback)
    resetQuote()
  }, [selectedWallet, network, resetQuote])

  // A cotação nasce ao entrar na revisão, com a rede escolhida na etapa anterior.
  useEffect(() => {
    if (step === 'review') ensure(network)
  }, [step, network, ensure])

  useEffect(() => {
    if (needsAcceptance) announce('Os valores da compra mudaram. Confirme os valores novos para continuar.', 'assertive')
  }, [needsAcceptance, announce])

  /**
   * Revalidação oportunista: ao voltar o foco para a janela, quando chega
   * nft.updated e ao reconectar o socket. Nunca durante um envio.
   */
  const maybeRevalidate = useCallback(() => {
    if (step !== 'review' || placement.busy) return
    void revalidate()
  }, [step, placement.busy, revalidate])

  useRealtimeEvent('nft.updated', maybeRevalidate)
  useRealtimeEvent('reconnect', maybeRevalidate)
  useEffect(() => {
    window.addEventListener('focus', maybeRevalidate)
    return () => window.removeEventListener('focus', maybeRevalidate)
  }, [maybeRevalidate])

  const changeNetwork = (next: Network) => {
    setNetwork(next)
    networkStore.set(next)
    // A cotação vale para uma rede: trocar a rede invalida a cotação e a tentativa.
    resetQuote()
    setCartNetwork.mutate(next, {
      onSuccess: (updated) => announce(`Rede alterada para ${NETWORK_LABEL[next]}. Nova taxa: ${updated.summary.networkFeeEth} ETH.`),
      onError: (e) => announce(e.message, 'assertive'),
    })
  }

  const reachable = STEP_ORDER.slice(0, STEP_ORDER.indexOf(step) + 1)
  const items = cart.data?.items ?? []
  const hasSoldOut = items.some((i) => i.notice === 'sold-out')

  return (
    <PageContainer className="py-8 md:py-12">
      <h1 className="text-3xl font-semibold md:text-4xl">Pagamento</h1>

      {cart.isPending ? (
        <div className="mt-8 flex flex-col gap-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : cart.isError ? (
        <div data-testid="cart-error" className="mt-8">
          <ErrorState title="Não foi possível carregar o seu carrinho" retrying={cart.isFetching} onRetry={() => void cart.refetch()} />
        </div>
      ) : items.length === 0 ? (
        <div data-testid="cart-empty" className="mt-8">
          <EmptyState
            icon={<ShoppingCart />}
            title="Não há itens para pagar"
            description="Seu carrinho está vazio. Escolha um NFT para continuar."
            action={
              <Button asChild>
                <Link to="/">Explorar NFTs</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div data-testid="checkout" className="mt-8 flex flex-col gap-6">
          <CheckoutSteps current={step} reachable={reachable} onNavigate={setStep} />

          {hasSoldOut ? (
            <p role="alert" className="rounded-xl bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive-text">
              Há item esgotado no carrinho. Ele não entra nesta compra —{' '}
              <Link to="/cart" className="underline">
                revise o carrinho
              </Link>
              .
            </p>
          ) : null}

          {step === 'buyer' ? (
            <BuyerStep
              initial={initialDraft.draft}
              onSubmit={(value) => {
                setBuyer(value)
                setStep('wallet')
              }}
            />
          ) : null}

          {step === 'wallet' ? (
            <WalletStep
              wallets={walletList}
              isLoading={wallets.isPending}
              isError={wallets.isError}
              onRetry={() => void wallets.refetch()}
              walletId={walletId}
              network={network}
              lostMessage={walletLost}
              onSelectWallet={(id) => {
                setWalletId(id)
                setWalletLost(null)
              }}
              onSelectNetwork={changeNetwork}
              onContinue={() => {
                setWalletLost(null)
                setStep('review')
              }}
            />
          ) : null}

          {step === 'review' && buyer ? (
            <ReviewStep
              quote={quoteFlow.quote}
              isCreatingQuote={quoteFlow.isCreating}
              isValidatingQuote={quoteFlow.isValidating}
              quoteError={quoteFlow.error}
              onRetryQuote={() => void quoteFlow.recreate(network)}
              changes={quoteFlow.changes}
              needsAcceptance={quoteFlow.needsAcceptance}
              onAcceptChanges={() => {
                quoteFlow.accept()
                placement.dismissProblem()
                announce('Valores novos aceitos. Você pode confirmar a compra.')
              }}
              buyer={buyer}
              wallet={selectedWallet}
              network={network}
              phase={placement.phase}
              busy={placement.busy}
              problem={placement.problem}
              onConfirm={() => {
                if (!walletId) return
                void placement.confirm({ walletId, network, buyer })
              }}
              onRetryOrder={() => void placement.retry()}
            />
          ) : null}
        </div>
      )}
    </PageContainer>
  )
}

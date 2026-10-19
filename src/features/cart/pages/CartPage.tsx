import { Link } from '@tanstack/react-router'
import { ArrowRight, ShoppingCart } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { UpdatingIndicator } from '@/components/ui/updating-indicator'
import { useAnnounce } from '@/components/ui/live-region'
import { useSession } from '@/features/session/session'
import { CartItemRow } from '../components/CartItemRow'
import { CartNotices } from '../components/CartNotices'
import { CouponForm } from '../components/CouponForm'
import { NetworkSelect } from '../components/NetworkSelect'
import { SummaryPanel } from '../components/SummaryPanel'
import { useCart, useRemoveCartItem, useSetCartNetwork, useUpdateCartItem } from '../hooks'

function CartSkeleton() {
  return (
    <div data-testid="cart-skeleton" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <ul className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <li key={i} className="rounded-xl bg-card p-4">
            <div className="flex gap-4">
              <Skeleton className="size-24 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <Skeleton className="h-9 w-32" />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function CartPage() {
  const announce = useAnnounce()
  const { isAuthenticated } = useSession()
  const cart = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const setNetwork = useSetCartNetwork()

  const busy = updateItem.isPending || removeItem.isPending || setNetwork.isPending
  const data = cart.data
  const hasSoldOut = !!data?.items.some((i) => i.notice === 'sold-out')

  return (
    <PageContainer className="py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold md:text-4xl">Carrinho</h1>
        <UpdatingIndicator active={cart.isFetching && !cart.isPending} id="cart" />
      </div>

      {cart.isPending ? (
        <div className="mt-8">
          <CartSkeleton />
        </div>
      ) : cart.isError ? (
        <div data-testid="cart-error" className="mt-8">
          <ErrorState
            title="Não foi possível carregar o carrinho"
            description="Verifique sua conexão e tente novamente."
            retrying={cart.isFetching}
            onRetry={() => void cart.refetch()}
          />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div data-testid="cart-empty" className="mt-8">
          <EmptyState
            icon={<ShoppingCart />}
            title="Seu carrinho está vazio"
            description="Explore o catálogo e escolha a sua próxima peça."
            action={
              <Button asChild>
                <Link to="/">Explorar NFTs</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div data-testid="cart" className="mt-8 flex flex-col gap-6">
          <CartNotices items={data.items} />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <ul className="flex flex-col gap-4">
              {data.items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  disabled={busy}
                  onQuantityChange={(quantity) =>
                    updateItem.mutate(
                      { itemId: item.id, quantity },
                      {
                        onSuccess: () => announce(`Quantidade de ${item.nftName} atualizada para ${quantity}.`),
                        onError: (e) => announce(e.message, 'assertive'),
                      },
                    )
                  }
                  onRemove={() =>
                    removeItem.mutate(item.id, {
                      onSuccess: () => announce(`${item.nftName} removido do carrinho.`),
                      onError: (e) => announce(e.message, 'assertive'),
                    })
                  }
                />
              ))}
            </ul>

            {/* No mobile o resumo fica abaixo da lista; em telas grandes acompanha a rolagem. */}
            <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
              <SummaryPanel summary={data.summary} coupon={data.coupon} network={data.network} testId="cart-summary">
                <NetworkSelect
                  value={data.network}
                  disabled={setNetwork.isPending}
                  hint="A rede escolhida define a taxa cobrada."
                  onChange={(network) =>
                    setNetwork.mutate(network, {
                      onSuccess: (updated) => announce(`Rede alterada. Nova taxa: ${updated.summary.networkFeeEth} ETH.`),
                      onError: (e) => announce(e.message, 'assertive'),
                    })
                  }
                />
                {hasSoldOut ? (
                  <p role="alert" className="text-sm font-medium text-destructive-text">
                    Remova os itens esgotados para finalizar a compra.
                  </p>
                ) : null}
                <Button
                  data-testid="cart-checkout"
                  asChild={!hasSoldOut}
                  disabled={hasSoldOut}
                  aria-disabled={hasSoldOut || undefined}
                  className="w-full"
                >
                  {hasSoldOut ? (
                    <>
                      Finalizar compra
                      <ArrowRight aria-hidden="true" />
                    </>
                  ) : isAuthenticated ? (
                    <Link to="/checkout">
                      Finalizar compra
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  ) : (
                    // Sem sessão o checkout é privado: a intenção vai explícita no `redirect`.
                    <Link to="/login" search={{ redirect: '/checkout' }}>
                      Entrar e finalizar compra
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  )}
                </Button>
              </SummaryPanel>

              <div className="rounded-xl bg-card p-5 text-card-foreground">
                <CouponForm coupon={data.coupon} />
              </div>
            </aside>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

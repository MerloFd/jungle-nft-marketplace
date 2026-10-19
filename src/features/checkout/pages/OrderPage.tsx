import { useEffect, useRef } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { CheckCircle2, Loader2, ShieldAlert } from 'lucide-react'
import type { OrderStatus } from '@/contracts'
import { isApiError } from '@/lib/http'
import { PageContainer } from '@/components/layout/PageContainer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { UpdatingIndicator } from '@/components/ui/updating-indicator'
import { useAnnounce } from '@/components/ui/live-region'
import { useRealtimeEvent } from '@/realtime/RealtimeProvider'
import { OrderReceipt } from '../components/OrderReceipt'
import { useOrder } from '../hooks'
import { attemptStore } from '../storage'

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Processando pagamento',
  confirmed: 'Compra confirmada',
  declined: 'Pagamento recusado',
}

export function OrderPage() {
  const { orderId } = useParams({ from: '/_authenticated/orders/$orderId' })
  const announce = useAnnounce()
  const order = useOrder(orderId)
  const status = order.data?.status

  /**
   * O socket é o caminho principal da atualização: o cliente de tempo real já
   * aplicou o evento no cache e invalidou a query. Aqui só anunciamos a mudança
   * — nunca escrevemos o status à mão nem simulamos evento.
   */
  useRealtimeEvent('order.updated', (event) => {
    if (event.data.orderId !== orderId) return
    announce(
      event.data.status === 'confirmed'
        ? 'Pedido confirmado.'
        : event.data.status === 'declined'
          ? 'Pagamento recusado.'
          : 'Pedido atualizado.',
      'assertive',
    )
  })

  // Anuncia também quando a mudança chega pelo polling (socket caído).
  const announced = useRef<OrderStatus | null>(null)
  useEffect(() => {
    if (!status || announced.current === status) return
    const previous = announced.current
    announced.current = status
    if (!previous || status === 'pending') return
    announce(status === 'confirmed' ? 'Pedido confirmado.' : 'Pagamento recusado.', 'assertive')
  }, [status, announce])

  // Status final: a tentativa de compra terminou e a chave não serve mais.
  useEffect(() => {
    if (status !== 'confirmed' && status !== 'declined') return
    const stored = attemptStore.get()
    if (stored) attemptStore.clear()
  }, [status])

  const notFound = order.isError && isApiError(order.error) && (order.error.status === 404 || order.error.status === 403)

  return (
    <PageContainer className="py-8 md:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold md:text-4xl">Pedido</h1>
        <UpdatingIndicator active={order.isFetching && !order.isPending} id="order" />
      </div>

      {order.isPending ? (
        <div data-testid="order-skeleton" className="mt-8 flex flex-col gap-6">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="flex flex-col gap-6">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      ) : notFound ? (
        <div data-testid="order-error" className="mt-8">
          <ErrorState
            title="Pedido não encontrado"
            description="Este pedido não existe ou não está na sua conta. Confira os seus pedidos a partir do carrinho."
          />
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="secondary" asChild>
              <Link to="/cart">Ir para o carrinho</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/">Explorar NFTs</Link>
            </Button>
          </div>
        </div>
      ) : order.isError || !order.data ? (
        <div data-testid="order-error" className="mt-8">
          <ErrorState
            title="Não foi possível carregar o pedido"
            description="Verifique sua conexão e tente novamente. O seu pedido continua registrado."
            retrying={order.isFetching}
            onRetry={() => void order.refetch()}
          />
        </div>
      ) : (
        <div data-testid="order" className="mt-8 flex flex-col gap-6">
          <section
            data-testid="order-status"
            data-status={order.data.status}
            aria-live="polite"
            className="flex flex-col gap-3 rounded-xl bg-card p-5 text-card-foreground md:p-6"
          >
            <div className="flex flex-wrap items-center gap-3">
              {order.data.status === 'pending' ? (
                <Loader2 aria-hidden="true" className="size-6 shrink-0 animate-spin text-warning-text" />
              ) : order.data.status === 'confirmed' ? (
                <CheckCircle2 aria-hidden="true" className="size-6 shrink-0 text-success-text" />
              ) : (
                <ShieldAlert aria-hidden="true" className="size-6 shrink-0 text-destructive-text" />
              )}
              <h2 className="text-2xl font-semibold">{STATUS_LABEL[order.data.status]}</h2>
              <Badge variant={order.data.status === 'confirmed' ? 'success' : order.data.status === 'declined' ? 'destructive' : 'warning'}>
                {order.data.status === 'pending' ? 'Pendente' : order.data.status === 'confirmed' ? 'Confirmado' : 'Recusado'}
              </Badge>
            </div>

            {order.data.status === 'pending' ? (
              <p className="text-muted-foreground">
                Estamos processando o pagamento na rede. Esta página se atualiza sozinha — você pode esperar aqui ou voltar depois: o
                pedido <span className="font-mono">{order.data.id}</span> continua válido.
              </p>
            ) : null}

            {order.data.status === 'confirmed' ? (
              <p className="text-muted-foreground">Pagamento confirmado pela rede. Abaixo está o recibo da sua compra.</p>
            ) : null}

            {order.data.status === 'declined' ? (
              <>
                <p data-testid="order-decline-reason" className="font-medium text-destructive-text">
                  {order.data.declineReason ?? 'O pagamento não foi aprovado pela carteira.'}
                </p>
                <p className="text-muted-foreground">Os itens continuam no seu carrinho: você pode revisar e tentar novamente.</p>
                <Button data-testid="order-retry" asChild className="self-start">
                  <Link to="/cart">Voltar ao carrinho e tentar de novo</Link>
                </Button>
              </>
            ) : null}
          </section>

          {order.data.status === 'confirmed' || order.data.status === 'pending' ? <OrderReceipt order={order.data} /> : null}
        </div>
      )}
    </PageContainer>
  )
}

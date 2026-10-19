import { ExternalLink } from 'lucide-react'
import { NETWORK_LABEL, WALLET_PROVIDER_LABEL, type Order } from '@/contracts'
import { formatEth } from '@/lib/money'
import { SummaryPanel } from '@/features/cart/components/SummaryPanel'

export interface OrderReceiptProps {
  order: Order
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

/**
 * Recibo: lê SOMENTE o snapshot imutável do pedido (`Order`), nunca o carrinho
 * atual — o carrinho muda depois da compra, o recibo não.
 */
export function OrderReceipt({ order }: OrderReceiptProps) {
  return (
    <div data-testid="order-receipt" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
        <section className="flex flex-col gap-4 rounded-xl bg-card p-5 text-card-foreground md:p-6">
          <h2 className="text-lg font-semibold">Itens comprados</h2>
          <ul className="flex flex-col gap-3">
            {order.lines.map((line) => (
              <li key={line.cartItemId} className="flex items-center gap-3">
                <img src={line.image} alt={line.imageAlt} width={56} height={56} loading="lazy" className="size-14 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{line.nftName}</p>
                  <p className="text-sm text-muted-foreground">
                    Edição {line.editionName} · {line.quantity} × {formatEth(line.unitPriceEth)}
                  </p>
                </div>
                <p className="font-mono tabular-nums">{formatEth(line.lineTotalEth)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4 rounded-xl bg-card p-5 text-card-foreground md:p-6">
          <h2 className="text-lg font-semibold">Dados da transação</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Pedido</dt>
              <dd data-testid="order-id" className="font-mono font-semibold">
                {order.id}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Criado em</dt>
              <dd className="font-semibold">{formatDateTime(order.createdAt)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">Hash da transação</dt>
              <dd data-testid="order-tx-hash" className="break-all font-mono text-sm">
                {order.transactionHash ?? 'Ainda não disponível'}
              </dd>
              {order.explorerUrl ? (
                <dd className="mt-1">
                  <a
                    href={order.explorerUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Ver no explorador da rede
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                </dd>
              ) : null}
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Carteira</dt>
              <dd className="font-semibold">
                {order.wallet.label} · {WALLET_PROVIDER_LABEL[order.wallet.provider]}
              </dd>
              <dd className="break-all font-mono text-xs text-muted-foreground">{order.wallet.address}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Rede</dt>
              <dd className="font-semibold">{NETWORK_LABEL[order.network]}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Colecionador</dt>
              <dd className="font-semibold">{order.buyer.fullName}</dd>
              <dd className="text-sm text-muted-foreground">{order.buyer.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">País</dt>
              <dd className="font-semibold">{order.buyer.country}</dd>
            </div>
          </dl>
        </section>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-24">
        <SummaryPanel summary={order.summary} coupon={order.coupon} network={order.network} title="Valores do pedido" />
      </aside>
    </div>
  )
}

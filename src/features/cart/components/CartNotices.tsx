import { AlertTriangle } from 'lucide-react'
import type { Cart } from '@/contracts'
import { Button } from '@/components/ui/button'
import { useAnnounce } from '@/components/ui/live-region'
import { useAcknowledgeCart } from '../hooks'

export interface CartNoticesProps {
  items: Cart['items']
}

/**
 * Resumo dos avisos de preço/estoque do carrinho. "Entendi" chama
 * POST /cart/acknowledge: o usuário aceita os valores atuais e a API limpa os
 * avisos (nada é apagado no cliente).
 */
export function CartNotices({ items }: CartNoticesProps) {
  const announce = useAnnounce()
  const acknowledge = useAcknowledgeCart()
  const flagged = items.filter((i) => i.notice)
  if (!flagged.length) return null

  const soldOut = flagged.filter((i) => i.notice === 'sold-out')
  const priceChanged = flagged.filter((i) => i.notice === 'price-increased' || i.notice === 'price-decreased')
  const reduced = flagged.filter((i) => i.notice === 'quantity-reduced')

  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4 md:flex-row md:items-start md:justify-between">
      <div className="flex gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning-text" />
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-semibold text-foreground">O carrinho mudou desde a sua última visita</p>
          {priceChanged.length ? <p className="text-muted-foreground">{priceChanged.length} item(ns) com preço atualizado.</p> : null}
          {reduced.length ? <p className="text-muted-foreground">{reduced.length} item(ns) com a quantidade reduzida por disponibilidade.</p> : null}
          {soldOut.length ? (
            <p className="font-medium text-destructive-text">
              {soldOut.length} item(ns) esgotado(s). Remova antes de finalizar a compra.
            </p>
          ) : null}
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        loading={acknowledge.isPending}
        className="shrink-0"
        onClick={() =>
          acknowledge.mutate(undefined, {
            onSuccess: () => announce('Avisos do carrinho confirmados.'),
            onError: () => announce('Não foi possível confirmar os avisos. Tente novamente.', 'assertive'),
          })
        }
      >
        Entendi
      </Button>
    </div>
  )
}

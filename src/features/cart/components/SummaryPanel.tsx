import type { ReactNode } from 'react'
import type { AppliedCoupon, Network, PriceSummary } from '@/contracts'
import { NETWORK_LABEL } from '@/contracts'
import { formatEth } from '@/lib/money'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export interface SummaryPanelProps {
  /** Resumo calculado pela API. Nunca recalculamos valores no cliente. */
  summary: PriceSummary
  coupon: AppliedCoupon | null
  network: Network
  title?: string
  /** `cart-summary` no carrinho; no checkout o bloco já está dentro de `quote`. */
  testId?: string
  children?: ReactNode
  className?: string
}

function Row({ label, value, testId, strong }: { label: string; value: string; testId: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn('text-sm', strong ? 'text-base font-semibold text-foreground' : 'text-muted-foreground')}>{label}</dt>
      <dd data-testid={testId} className={cn('font-mono tabular-nums', strong ? 'text-lg font-semibold' : 'text-sm')}>
        {value}
      </dd>
    </div>
  )
}

/** Resumo de valores: a API é a fonte da verdade de subtotal, desconto, taxa e total. */
export function SummaryPanel({ summary, coupon, network, title = 'Resumo', testId, children, className }: SummaryPanelProps) {
  return (
    <section data-testid={testId} aria-label={title} className={cn('rounded-xl bg-card p-5 text-card-foreground', className)}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <dl className="mt-4 flex flex-col gap-3">
        <Row label="Subtotal" value={formatEth(summary.subtotalEth)} testId="summary-subtotal" />
        <Row
          label={coupon ? `Desconto (${coupon.code} · ${coupon.percentOff}%)` : 'Desconto'}
          value={`- ${formatEth(summary.discountEth)}`}
          testId="summary-discount"
        />
        <Row label={`Taxa de rede (${NETWORK_LABEL[network]})`} value={formatEth(summary.networkFeeEth)} testId="summary-fee" />
        <Separator className="my-1" />
        <Row label="Total" value={formatEth(summary.totalEth)} testId="summary-total" strong />
      </dl>
      {children ? <div className="mt-5 flex flex-col gap-3">{children}</div> : null}
    </section>
  )
}

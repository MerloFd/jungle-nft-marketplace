import { AlertTriangle, Loader2, Lock, RotateCw, ShieldCheck } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { NETWORK_LABEL, type BuyerInfo, type Network, type Quote, type QuoteValidation, type Wallet } from '@/contracts'
import { formatEth } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { SummaryPanel } from '@/features/cart/components/SummaryPanel'
import type { PlacementPhase, PlacementProblem } from '../hooks'

const CHANGE_PREFIX: Record<QuoteValidation['changes'][number]['kind'], string> = {
  price: 'Preço',
  availability: 'Disponibilidade',
  coupon: 'Cupom',
  fee: 'Taxa de rede',
  removed: 'Item removido',
}

export interface ReviewStepProps {
  quote: Quote | null
  isCreatingQuote: boolean
  isValidatingQuote: boolean
  quoteError: Error | null
  onRetryQuote: () => void
  changes: QuoteValidation['changes']
  needsAcceptance: boolean
  onAcceptChanges: () => void
  buyer: BuyerInfo
  wallet: Wallet | null
  network: Network
  phase: PlacementPhase
  busy: boolean
  problem: PlacementProblem | null
  onConfirm: () => void
  onRetryOrder: () => void
}

function formatExpiry(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

/**
 * Etapa 3: revisão, cotação e confirmação. O botão de confirmar só envia o
 * fingerprint que está na tela — qualquer mudança exige aceite explícito.
 */
export function ReviewStep({
  quote,
  isCreatingQuote,
  isValidatingQuote,
  quoteError,
  onRetryQuote,
  changes,
  needsAcceptance,
  onAcceptChanges,
  buyer,
  wallet,
  network,
  phase,
  busy,
  problem,
  onConfirm,
  onRetryOrder,
}: ReviewStepProps) {
  if (!quote && isCreatingQuote) {
    return (
      <div data-testid="quote-skeleton" className="flex flex-col gap-4 rounded-xl bg-card p-5 md:p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (!quote) {
    return (
      <div data-testid="quote-error">
        <ErrorState
          title="Não foi possível calcular a sua compra"
          description={quoteError?.message ?? 'Tente novamente ou volte ao carrinho para revisar os itens.'}
          retrying={isCreatingQuote}
          onRetry={onRetryQuote}
        />
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" asChild>
            <Link to="/cart">Voltar ao carrinho</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="quote" className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-xl bg-card p-5 text-card-foreground md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">Revisão da compra</h2>
          <p className="text-sm text-muted-foreground">
            Valores garantidos até{' '}
            <time data-testid="quote-expires-at" dateTime={quote.expiresAt} className="font-semibold text-foreground">
              {formatExpiry(quote.expiresAt)}
            </time>
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {quote.lines.map((line) => (
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

      {needsAcceptance ? (
        <section data-testid="quote-changed-notice" role="alert" className="flex flex-col gap-3 rounded-xl border border-warning/50 bg-warning/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning-text" />
            <div>
              <h3 className="font-semibold">Os valores da sua compra mudaram</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Revise as alterações abaixo. A compra só é enviada depois que você confirmar os valores novos.
              </p>
            </div>
          </div>
          <ul className="flex flex-col gap-1 pl-8 text-sm">
            {changes.length ? (
              changes.map((change, i) => (
                <li key={`${change.kind}-${i}`}>
                  <span className="font-semibold">{CHANGE_PREFIX[change.kind]}:</span> {change.message}
                </li>
              ))
            ) : (
              <li>A cotação foi recalculada pelo servidor.</li>
            )}
          </ul>
          <Button data-testid="quote-accept-changes" variant="secondary" className="self-start" onClick={onAcceptChanges}>
            Entendi, usar os valores novos
          </Button>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section className="flex min-w-0 flex-col gap-4 rounded-xl bg-card p-5 text-card-foreground md:p-6">
          <h3 className="text-lg font-semibold">Pagamento e dados</h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Carteira</dt>
              <dd className="font-semibold">{wallet?.label ?? '—'}</dd>
              <dd className="break-all font-mono text-xs text-muted-foreground">{wallet?.address}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Rede</dt>
              <dd className="font-semibold">{NETWORK_LABEL[network]}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Colecionador</dt>
              <dd className="font-semibold">{buyer.fullName}</dd>
              <dd className="text-sm text-muted-foreground">{buyer.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">País</dt>
              <dd className="font-semibold">{buyer.country}</dd>
            </div>
          </dl>
        </section>

        {/* No mobile o resumo fica abaixo da revisão; em telas grandes acompanha a rolagem. */}
        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24">
          <SummaryPanel summary={quote.summary} coupon={quote.coupon} network={quote.network} title="Total da compra">
            {phase === 'recovering' ? (
              <p role="status" className="flex items-start gap-2 rounded-xl bg-accent px-3 py-2 text-sm">
                <Loader2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin" />
                Não tivemos resposta do servidor. Estamos verificando se o seu pedido foi criado…
              </p>
            ) : null}

            {problem ? (
              <div role="alert" className="flex flex-col gap-2 rounded-xl bg-destructive/15 px-3 py-3 text-sm text-destructive-text">
                <p className="font-medium">{problem.message}</p>
                {problem.canRetry ? (
                  <Button variant="secondary" size="sm" className="self-start" loading={busy} onClick={onRetryOrder}>
                    {busy ? null : <RotateCw aria-hidden="true" />}
                    Tentar novamente
                  </Button>
                ) : null}
                {problem.kind === 'unavailable' ? (
                  <Button variant="ghost" size="sm" className="self-start" asChild>
                    <Link to="/cart">Voltar ao carrinho</Link>
                  </Button>
                ) : null}
              </div>
            ) : null}

            <Button
              data-testid="place-order"
              size="lg"
              className="w-full"
              loading={busy}
              // Bloqueado enquanto há envio/recuperação em curso e enquanto a
              // cotação nova não foi aceita: nunca enviamos um valor não visto.
              disabled={busy || needsAcceptance || isValidatingQuote}
              aria-disabled={busy || needsAcceptance || undefined}
              onClick={onConfirm}
            >
              {busy ? null : <Lock aria-hidden="true" />}
              {phase === 'validating' ? 'Revalidando valores…' : phase === 'placing' ? 'Enviando pedido…' : `Confirmar compra de ${formatEth(quote.summary.totalEth)}`}
            </Button>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Revalidamos preço, disponibilidade e taxas antes de enviar. A compra só é concluída quando a API confirma.
            </p>
          </SummaryPanel>
        </aside>
      </div>
    </div>
  )
}

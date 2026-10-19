import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Plug, PlugZap, Wallet as WalletIcon } from 'lucide-react'
import { NETWORK_LABEL, WALLET_PROVIDER_LABEL, type Network, type Wallet } from '@/contracts'
import { isApiError } from '@/lib/http'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnnounce } from '@/components/ui/live-region'
import { NetworkSelect } from '@/features/cart/components/NetworkSelect'
import { useConnectWallet, useDisconnectWallet, useWalletConnection } from '../hooks'
import type { WalletConnection } from '@/contracts'

export interface WalletStepProps {
  wallets: Wallet[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  walletId: string | null
  network: Network
  /** Mensagem herdada de uma desconexão detectada no envio do pedido. */
  lostMessage: string | null
  onSelectWallet: (walletId: string) => void
  onSelectNetwork: (network: Network) => void
  onContinue: () => void
}

function connectionMatches(connection: WalletConnection | null | undefined, walletId: string | null, network: Network) {
  return !!connection && connection.status === 'connected' && connection.walletId === walletId && connection.network === network
}

/**
 * Etapa 2: carteira e rede. A conexão é estado volátil do servidor
 * (`GET /wallets/connection`), reconsultada ao entrar na etapa — nunca inferida
 * do clique anterior.
 */
export function WalletStep({
  wallets,
  isLoading,
  isError,
  onRetry,
  walletId,
  network,
  lostMessage,
  onSelectWallet,
  onSelectNetwork,
  onContinue,
}: WalletStepProps) {
  const announce = useAnnounce()
  const connectionQuery = useWalletConnection()
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()
  const [error, setError] = useState<string | null>(null)

  const selected = wallets?.find((w) => w.id === walletId) ?? null
  const connection = connectionQuery.data
  const connected = connectionMatches(connection, walletId, network)
  const connectedToOther = !!connection && connection.status === 'connected' && !connected

  if (isLoading) {
    return (
      <div data-testid="checkout-wallets-skeleton" className="flex flex-col gap-4 rounded-xl bg-card p-5 md:p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <div data-testid="checkout-wallets-error">
        <ErrorState title="Não foi possível carregar suas carteiras" onRetry={onRetry} />
      </div>
    )
  }

  if (!wallets || wallets.length === 0) {
    return (
      <div data-testid="checkout-wallets-empty">
        <EmptyState
          icon={<WalletIcon />}
          title="Você ainda não cadastrou uma carteira"
          description="Cadastre uma carteira para concluir a compra."
          action={
            <Button asChild>
              <Link to="/account/wallets">Cadastrar carteira</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-5 rounded-xl bg-card p-5 text-card-foreground md:p-6">
      <div>
        <h2 className="text-xl font-semibold">Carteira e rede</h2>
        <p className="mt-1 text-sm text-muted-foreground">Conecte a carteira na rede que vai pagar a compra.</p>
      </div>

      {lostMessage ? (
        <p role="alert" className="rounded-xl bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive-text">
          {lostMessage} Conecte novamente para confirmar a compra.
        </p>
      ) : null}

      {/* `min-w-0` no fieldset: por padrão ele usa min-content e estouraria a tela em 390px. */}
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="mb-2 text-sm font-semibold">Carteira</legend>
        <RadioGroup
          value={walletId ?? undefined}
          onValueChange={(value) => {
            setError(null)
            onSelectWallet(value)
          }}
        >
          {wallets.map((wallet) => (
            <div key={wallet.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-border px-4 py-3">
              <RadioGroupItem
                id={`wallet-${wallet.id}`}
                value={wallet.id}
                data-testid={`wallet-option-${wallet.id}`}
                className="mt-1"
              />
              <Label htmlFor={`wallet-${wallet.id}`} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  {wallet.label}
                  <Badge variant={wallet.role === 'primary' ? 'default' : 'secondary'}>
                    {wallet.role === 'primary' ? 'Principal' : 'Secundária'}
                  </Badge>
                </span>
                <span className="break-all font-mono text-xs font-normal text-muted-foreground">{wallet.address}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {WALLET_PROVIDER_LABEL[wallet.provider]} · {wallet.networks.map((n) => NETWORK_LABEL[n]).join(', ')}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      <NetworkSelect
        value={network}
        options={selected?.networks}
        testId="network-select"
        hint="A rede escolhida define a taxa cobrada e precisa ser suportada pela carteira."
        onChange={(next) => {
          setError(null)
          onSelectNetwork(next)
        }}
      />

      <div
        data-testid="wallet-status"
        data-status={connected ? 'connected' : 'disconnected'}
        role="status"
        className="flex flex-wrap items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm"
      >
        {connected ? (
          <>
            <PlugZap aria-hidden="true" className="size-4 text-success-text" />
            <span className="font-semibold text-success-text">Carteira conectada</span>
            <span className="text-muted-foreground">
              {selected?.label} · {NETWORK_LABEL[network]}
            </span>
          </>
        ) : (
          <>
            <Plug aria-hidden="true" className="size-4 text-muted-foreground" />
            <span className="font-semibold">Carteira não conectada</span>
            <span className="text-muted-foreground">
              {connectedToOther
                ? 'Há outra carteira/rede conectada. Conecte a combinação escolhida acima.'
                : 'Conecte para liberar a confirmação da compra.'}
            </span>
          </>
        )}
        {connectionQuery.isFetching ? <span className="text-muted-foreground">Verificando…</span> : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive-text">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {connected ? (
          <Button
            variant="secondary"
            loading={disconnect.isPending}
            onClick={() =>
              walletId &&
              disconnect.mutate(walletId, {
                onSuccess: () => announce('Carteira desconectada.'),
              })
            }
          >
            Desconectar
          </Button>
        ) : (
          <Button
            data-testid="wallet-connect"
            loading={connect.isPending}
            disabled={!walletId}
            onClick={() => {
              if (!walletId) return
              setError(null)
              connect.mutate(
                { walletId, network },
                {
                  onSuccess: () => announce(`Carteira conectada na rede ${NETWORK_LABEL[network]}.`),
                  onError: (e) => {
                    // WALLET_REJECTED: o usuário recusou na carteira. Pode tentar de novo ou escolher outra.
                    const message = isApiError(e)
                      ? e.code === 'WALLET_REJECTED'
                        ? 'A conexão foi recusada na carteira. Tente novamente ou escolha outra carteira.'
                        : e.message
                      : 'Não foi possível conectar a carteira. Tente novamente.'
                    setError(message)
                    announce(message, 'assertive')
                  },
                },
              )
            }}
          >
            <Plug aria-hidden="true" />
            Conectar carteira
          </Button>
        )}

        <Button disabled={!connected} aria-disabled={!connected || undefined} onClick={onContinue}>
          Continuar
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  )
}

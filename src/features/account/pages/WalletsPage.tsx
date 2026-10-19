import * as React from 'react'
import { Plus, Wallet as WalletIcon } from 'lucide-react'
import type { Wallet } from '@/contracts'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { UpdatingIndicator } from '@/components/ui/updating-indicator'
import { WalletCard } from '../components/WalletCard'
import { WalletFormDialog } from '../components/WalletFormDialog'
import { useWallets } from '../hooks'

/** Mesmas dimensões do cartão real (badge + título, endereço e redes). */
function WalletsSkeleton() {
  return (
    <div data-testid="wallets-skeleton" className="grid gap-4 md:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-4 rounded-xl bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-5 w-36" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function WalletsPage() {
  const wallets = useWallets()
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Wallet | null>(null)
  const items = wallets.data ?? []
  // A API aceita uma carteira por função (principal/secundária): com as duas, só resta editar.
  const rolesFull = items.some((w) => w.role === 'primary') && items.some((w) => w.role === 'secondary')

  // O diálogo é controlado e não tem DialogTrigger, então o Radix não tem gatilho
  // para devolver o foco. Guardamos o seletor, e não o nó: a lista revalida ao
  // fechar e o elemento original pode já ter sido substituído.
  const triggerSelector = React.useRef<string | null>(null)

  function openNew() {
    triggerSelector.current = '[data-testid="wallet-new"]'
    setEditing(null)
    setOpen(true)
  }

  function openEdit(wallet: Wallet) {
    triggerSelector.current = `[data-testid="wallet-edit-${wallet.id}"]`
    setEditing(wallet)
    setOpen(true)
  }

  function restoreFocus() {
    const selector = triggerSelector.current
    if (!selector) return
    requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus())
  }

  return (
    <PageContainer as="section" className="py-10 md:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold md:text-4xl">Carteiras</h1>
        <div className="flex items-center gap-3">
          <UpdatingIndicator id="wallets" active={wallets.isFetching && !wallets.isPending} />
          {!wallets.isPending && !wallets.isError && items.length > 0 && !rolesFull ? (
            <Button data-testid="wallet-new" onClick={openNew}>
              <Plus aria-hidden="true" />
              Adicionar carteira
            </Button>
          ) : null}
        </div>
      </div>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Cadastre a carteira principal e, se quiser, uma secundária. Elas aparecem no checkout para assinar a compra.
      </p>

      <div className="mt-8">
        {wallets.isPending ? (
          <WalletsSkeleton />
        ) : wallets.isError ? (
          <div data-testid="wallets-error">
            <ErrorState
              title="Não foi possível carregar suas carteiras"
              description="Verifique sua conexão e tente novamente."
              onRetry={() => void wallets.refetch()}
              retrying={wallets.isFetching}
            />
          </div>
        ) : items.length === 0 ? (
          <div data-testid="wallets-empty">
            <EmptyState
              icon={<WalletIcon />}
              title="Nenhuma carteira cadastrada"
              description="Adicione sua carteira principal para poder finalizar compras."
              action={
                <Button data-testid="wallet-new" onClick={openNew}>
                  <Plus aria-hidden="true" />
                  Adicionar carteira
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <ul data-testid="wallets" className="grid gap-4 md:grid-cols-2">
              {items.map((wallet) => (
                <li key={wallet.id}>
                  <WalletCard wallet={wallet} onEdit={openEdit} />
                </li>
              ))}
            </ul>
            {rolesFull ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Você já tem uma carteira principal e uma secundária. Para trocar endereços ou redes, edite uma delas.
              </p>
            ) : null}
          </>
        )}
      </div>

      <WalletFormDialog
        open={open}
        onOpenChange={setOpen}
        wallet={editing}
        wallets={items}
        onCloseFocus={restoreFocus}
      />
    </PageContainer>
  )
}

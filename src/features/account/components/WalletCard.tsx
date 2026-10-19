import { Pencil } from 'lucide-react'
import { NETWORK_LABEL, WALLET_PROVIDER_LABEL, type Wallet } from '@/contracts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/** Endereço truncado no meio (0x1234…abcd). O valor completo fica no title e no sr-only. */
export function truncateAddress(address: string, head = 6, tail = 4): string {
  if (address.length <= head + tail + 1) return address
  return `${address.slice(0, head)}…${address.slice(-tail)}`
}

export function WalletCard({ wallet, onEdit }: { wallet: Wallet; onEdit: (wallet: Wallet) => void }) {
  const isPrimary = wallet.role === 'primary'
  return (
    <div data-testid={`wallet-card-${wallet.id}`} className="flex flex-col gap-4 rounded-xl bg-card p-5 text-card-foreground">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isPrimary ? 'default' : 'secondary'}>{isPrimary ? 'Principal' : 'Secundária'}</Badge>
            <h3 className="truncate text-lg font-semibold">{wallet.label}</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{WALLET_PROVIDER_LABEL[wallet.provider]}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          data-testid={`wallet-edit-${wallet.id}`}
          onClick={() => onEdit(wallet)}
        >
          <Pencil aria-hidden="true" />
          Editar
        </Button>
      </div>

      <p className="font-mono text-sm text-foreground" title={wallet.address}>
        <span aria-hidden="true">{truncateAddress(wallet.address)}</span>
        <span className="sr-only">Endereço: {wallet.address}</span>
      </p>

      <ul className="flex flex-wrap gap-2">
        {wallet.networks.map((network) => (
          <li key={network}>
            <Badge variant="outline">{NETWORK_LABEL[network]}</Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}

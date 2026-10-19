import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, Minus, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import type { CartItem } from '@/contracts'
import { formatEth } from '@/lib/money'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Texto do aviso que a API anexou ao item (preço ou estoque mudaram). */
export const NOTICE_TEXT: Record<NonNullable<CartItem['notice']>, string> = {
  'price-increased': 'O preço desta edição subiu depois que você adicionou ao carrinho. O resumo já considera o valor novo.',
  'price-decreased': 'O preço desta edição caiu depois que você adicionou ao carrinho. O resumo já considera o valor novo.',
  'quantity-reduced': 'A quantidade foi reduzida porque não há mais unidades disponíveis.',
  'sold-out': 'Esta edição esgotou e não entra na compra. Remova o item para continuar.',
}

const NOTICE_VARIANT: Record<NonNullable<CartItem['notice']>, 'warning' | 'success' | 'destructive'> = {
  'price-increased': 'warning',
  'price-decreased': 'success',
  'quantity-reduced': 'warning',
  'sold-out': 'destructive',
}

const NOTICE_LABEL: Record<NonNullable<CartItem['notice']>, string> = {
  'price-increased': 'Preço subiu',
  'price-decreased': 'Preço caiu',
  'quantity-reduced': 'Quantidade ajustada',
  'sold-out': 'Esgotado',
}

export interface CartItemRowProps {
  item: CartItem
  /** Alguma mutation do carrinho em andamento: evita cliques concorrentes. */
  disabled?: boolean
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}

export function CartItemRow({ item, disabled, onQuantityChange, onRemove }: CartItemRowProps) {
  const cap = Math.min(item.available, item.maxPerOrder)
  const soldOut = item.notice === 'sold-out' || cap === 0
  const [draft, setDraft] = useState(String(item.quantity))

  // A API é a fonte da verdade: quando o carrinho volta do servidor, o campo acompanha.
  useEffect(() => setDraft(String(item.quantity)), [item.quantity])

  const commit = (value: string) => {
    const next = Number.parseInt(value, 10)
    if (!Number.isFinite(next) || next < 1) {
      setDraft(String(item.quantity))
      return
    }
    const clamped = Math.min(next, cap)
    setDraft(String(clamped))
    if (clamped !== item.quantity) onQuantityChange(clamped)
  }

  const notice = item.notice
  const Icon = notice === 'price-increased' ? TrendingUp : notice === 'price-decreased' ? TrendingDown : AlertTriangle

  return (
    <li data-testid={`cart-item-${item.id}`} className="rounded-xl bg-card p-4 text-card-foreground">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <img
            src={item.image}
            alt={item.imageAlt}
            width={96}
            height={96}
            loading="lazy"
            className="size-24 w-full rounded-lg object-cover sm:w-24"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Link
            to="/nft/$nftId"
            params={{ nftId: item.nftId }}
            className="truncate text-lg font-semibold hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {item.nftName}
          </Link>
          <p className="text-sm text-muted-foreground">
            Edição {item.editionName} · {formatEth(item.unitPriceEth)} por unidade
          </p>
          <p className="text-sm text-muted-foreground">
            {soldOut ? 'Sem unidades disponíveis' : `Até ${cap} unidade(s) por pedido`}
          </p>
          {notice ? (
            <Badge variant={NOTICE_VARIANT[notice]} className="mt-1 w-fit">
              <Icon aria-hidden="true" />
              {NOTICE_LABEL[notice]}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p className="font-mono text-lg font-semibold tabular-nums">{formatEth(item.lineTotalEth)}</p>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="size-9"
              aria-label={`Diminuir quantidade de ${item.nftName}`}
              disabled={disabled || soldOut || item.quantity <= 1}
              onClick={() => onQuantityChange(item.quantity - 1)}
            >
              <Minus aria-hidden="true" />
            </Button>
            <Input
              data-testid="cart-item-qty"
              type="number"
              inputMode="numeric"
              min={1}
              max={Math.max(cap, 1)}
              value={draft}
              disabled={disabled || soldOut}
              aria-label={`Quantidade de ${item.nftName}`}
              className="h-9 w-16 px-2 text-center"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commit(e.currentTarget.value)
                }
              }}
            />
            <Button
              variant="secondary"
              size="icon"
              className="size-9"
              aria-label={`Aumentar quantidade de ${item.nftName}`}
              disabled={disabled || soldOut || item.quantity >= cap}
              onClick={() => onQuantityChange(item.quantity + 1)}
            >
              <Plus aria-hidden="true" />
            </Button>
            <Button
              data-testid="cart-item-remove"
              variant="ghost"
              size="icon"
              className="size-9 text-muted-foreground hover:text-destructive-text"
              aria-label={`Remover ${item.nftName} do carrinho`}
              disabled={disabled}
              onClick={onRemove}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {notice ? (
        <p
          data-testid="cart-item-notice"
          className={notice === 'sold-out' ? 'mt-3 rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive-text' : 'mt-3 rounded-lg bg-accent px-3 py-2 text-sm text-muted-foreground'}
        >
          {NOTICE_TEXT[notice]}
        </p>
      ) : null}
    </li>
  )
}

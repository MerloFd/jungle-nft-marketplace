import { useState, type FormEvent } from 'react'
import { Tag, X } from 'lucide-react'
import { ApplyCouponInput, type AppliedCoupon } from '@/contracts'
import { isApiError } from '@/lib/http'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAnnounce } from '@/components/ui/live-region'
import { useApplyCoupon, useRemoveCoupon } from '../hooks'

export interface CouponFormProps {
  coupon: AppliedCoupon | null
}

/**
 * Cupom. Os erros COUPON_INVALID e COUPON_EXPIRED vêm da API em `fields.code`
 * e são exibidos no próprio campo (associados via `Field`), não só em toast.
 */
export function CouponForm({ coupon }: CouponFormProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const announce = useAnnounce()
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()

  if (coupon) {
    return (
      <div data-testid="coupon-applied" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-accent px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          <Tag aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success-text" />
          <div className="min-w-0">
            <p className="font-semibold">
              {coupon.code} · {coupon.percentOff}% de desconto
            </p>
            <p className="text-sm text-muted-foreground">{coupon.description}</p>
          </div>
        </div>
        <Button
          data-testid="coupon-remove"
          variant="ghost"
          size="sm"
          loading={remove.isPending}
          aria-label={`Remover o cupom ${coupon.code}`}
          onClick={() =>
            remove.mutate(undefined, {
              onSuccess: () => announce('Cupom removido.'),
              onError: () => announce('Não foi possível remover o cupom.', 'assertive'),
            })
          }
        >
          {remove.isPending ? null : <X aria-hidden="true" />}
          Remover
        </Button>
      </div>
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = ApplyCouponInput.safeParse({ code })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Informe o cupom')
      return
    }
    setError(null)
    apply.mutate(parsed.data.code, {
      onSuccess: (cart) => {
        setCode('')
        announce(cart.coupon ? `Cupom ${cart.coupon.code} aplicado: ${cart.coupon.percentOff}% de desconto.` : 'Cupom aplicado.')
      },
      onError: (e2) => {
        // A API devolve a mensagem por campo (fields.code) nos casos de cupom inválido/expirado.
        const field = isApiError(e2) ? e2.fields?.code : undefined
        const message = field ?? (isApiError(e2) ? e2.message : 'Não foi possível aplicar o cupom. Tente novamente.')
        setError(message)
        announce(message, 'assertive')
      },
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <div data-testid={error ? 'coupon-error' : undefined}>
        <Field label="Cupom de desconto" error={error} hint="Tem um cupom? Aplique antes de finalizar.">
          <Input
            data-testid="coupon-input"
            value={code}
            autoComplete="off"
            placeholder="Ex.: JUNGLE10"
            onChange={(e) => {
              setCode(e.target.value)
              if (error) setError(null)
            }}
          />
        </Field>
      </div>
      <Button data-testid="coupon-apply" type="submit" variant="secondary" loading={apply.isPending} disabled={!code.trim()} className="w-full">
        Aplicar cupom
      </Button>
    </form>
  )
}

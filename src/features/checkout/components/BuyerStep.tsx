import { useEffect, useRef, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { BuyerInfo } from '@/contracts'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { focusFirstInvalid, useFormState, zodErrors } from '@/features/account/form'
import { buyerDraftStore, type BuyerDraft } from '../storage'

export interface BuyerStepProps {
  initial: BuyerDraft
  onSubmit: (buyer: BuyerInfo) => void
}

/**
 * Etapa 1: dados do colecionador, validados com o schema `BuyerInfo` do
 * contrato. O rascunho é persistido em sessionStorage para sobreviver a um
 * refresh ou a um desvio para o login (sessão expirada no meio do fluxo).
 */
export function BuyerStep({ initial, onSubmit }: BuyerStepProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const { values, set, errors, setErrors } = useFormState<BuyerDraft>(initial)

  useEffect(() => {
    buyerDraftStore.set(values)
  }, [values])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = BuyerInfo.safeParse(values)
    if (!parsed.success) {
      setErrors(zodErrors(parsed.error.issues))
      focusFirstInvalid(formRef.current)
      return
    }
    setErrors({})
    onSubmit(parsed.data)
  }

  return (
    <form ref={formRef} data-testid="buyer-form" onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-xl bg-card p-5 text-card-foreground md:p-6">
      <div>
        <h2 className="text-xl font-semibold">Seus dados</h2>
        <p className="mt-1 text-sm text-muted-foreground">Usamos estes dados no recibo da compra.</p>
      </div>

      <Field label="Nome completo" error={errors.fullName} required>
        <Input value={values.fullName} autoComplete="name" onChange={(e) => set('fullName', e.target.value)} />
      </Field>

      <Field label="E-mail" error={errors.email} required hint="Enviamos a confirmação do pedido para este e-mail.">
        <Input type="email" value={values.email} autoComplete="email" onChange={(e) => set('email', e.target.value)} />
      </Field>

      <Field label="País" error={errors.country} required>
        <Input value={values.country} autoComplete="country-name" onChange={(e) => set('country', e.target.value)} />
      </Field>

      <Field
        label="Aceito os termos de uso e a política de reembolso"
        hint="A compra de NFT é definitiva depois de confirmada na rede."
        error={errors.acceptTerms}
        required
      >
        {(fieldProps) => (
          <Checkbox {...fieldProps} checked={values.acceptTerms} onCheckedChange={(checked) => set('acceptTerms', checked === true)} />
        )}
      </Field>

      <Button type="submit" className="self-start">
        Continuar
        <ArrowRight aria-hidden="true" />
      </Button>
    </form>
  )
}

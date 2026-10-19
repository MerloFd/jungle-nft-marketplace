import * as React from 'react'
import {
  NETWORK_LABEL,
  Network,
  WALLET_PROVIDER_LABEL,
  WalletInput,
  WalletProvider,
  type Wallet,
  type WalletRole,
} from '@/contracts'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAnnounce } from '@/components/ui/live-region'
import { useSaveWallet } from '../hooks'
import { apiErrors, focusFirstInvalid, useFormState, zodErrors } from '../form'

type WalletFormValues = {
  role: WalletRole
  label: string
  provider: WalletProvider
  address: string
  networks: Network[]
}

const ROLE_LABEL: Record<WalletRole, string> = { primary: 'Principal', secondary: 'Secundária' }

function initialValues(wallet: Wallet | null, wallets: Wallet[]): WalletFormValues {
  if (wallet) {
    return { role: wallet.role, label: wallet.label, provider: wallet.provider, address: wallet.address, networks: [...wallet.networks] }
  }
  // Sugere a função ainda livre (a API aceita só uma carteira por função).
  const freeRole: WalletRole = wallets.some((w) => w.role === 'primary') ? 'secondary' : 'primary'
  return { role: freeRole, label: '', provider: 'metamask', address: '', networks: ['ethereum'] }
}

export interface WalletFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Carteira em edição, ou null para cadastro. */
  wallet: Wallet | null
  /** Lista atual, para avisar sobre conflito de função. */
  wallets: Wallet[]
}

export function WalletFormDialog({ open, onOpenChange, wallet, wallets }: WalletFormDialogProps) {
  const save = useSaveWallet()
  const announce = useAnnounce()
  const formRef = React.useRef<HTMLFormElement>(null)
  const { values, setValues, set, errors, setErrors, formError, setFormError } = useFormState<WalletFormValues>(
    initialValues(wallet, wallets),
  )

  // A lista só é lida no momento da abertura (sugestão de função), por isso fica num ref:
  // uma revalidação em segundo plano não deve reescrever o que o usuário está digitando.
  const walletsRef = React.useRef(wallets)
  walletsRef.current = wallets

  // Ao abrir, o formulário reflete exatamente a carteira escolhida (ou um cadastro limpo).
  React.useEffect(() => {
    if (!open) return
    setValues(initialValues(wallet, walletsRef.current))
    setErrors({})
    setFormError(null)
  }, [open, wallet, setValues, setErrors, setFormError])

  /** Outra carteira já ocupa a função escolhida: a API responde 409 CONFLICT. */
  const roleConflict = wallets.find((w) => w.id !== wallet?.id && w.role === values.role) ?? null

  function toggleNetwork(network: Network, checked: boolean) {
    set('networks', checked ? [...values.networks, network] : values.networks.filter((n) => n !== network))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = WalletInput.safeParse(values)
    if (!parsed.success) {
      setErrors(zodErrors(parsed.error.issues))
      focusFirstInvalid(formRef.current)
      return
    }
    setErrors({})
    save.mutate(
      { id: wallet?.id, input: parsed.data },
      {
        onSuccess: (saved) => {
          announce(wallet ? `Carteira ${saved.label} atualizada.` : `Carteira ${saved.label} adicionada.`)
          onOpenChange(false)
        },
        onError: (error) => {
          // Conflitos de função e de endereço chegam em `error.fields`.
          const { fields, message } = apiErrors(error, 'Não foi possível salvar a carteira. Tente novamente.')
          setErrors(fields)
          setFormError(Object.keys(fields).length ? null : message)
          focusFirstInvalid(formRef.current)
          announce('Não foi possível salvar a carteira.', 'assertive')
        },
      },
    )
  }

  const networksErrorId = 'wallet-networks-error'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="wallet-form-description">
        <DialogHeader>
          <DialogTitle>{wallet ? 'Editar carteira' : 'Adicionar carteira'}</DialogTitle>
          <DialogDescription id="wallet-form-description">
            Carteiras são usadas no checkout para assinar a compra. Você pode ter uma principal e uma secundária.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} data-testid="wallet-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
          {formError ? (
            <p role="alert" className="rounded-xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive-text">
              {formError}
            </p>
          ) : null}

          <Field label="Função" error={errors.role} required>
            {(props) => (
              <RadioGroup
                {...props}
                value={values.role}
                onValueChange={(v) => set('role', v as WalletRole)}
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {(['primary', 'secondary'] as const).map((role) => (
                  <div key={role} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5">
                    <RadioGroupItem value={role} id={`wallet-role-${role}`} />
                    <Label htmlFor={`wallet-role-${role}`} className="cursor-pointer font-normal">
                      {ROLE_LABEL[role]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </Field>

          {roleConflict ? (
            <p role="status" className="rounded-xl border border-warning/60 bg-warning/15 px-4 py-3 text-sm font-medium text-warning-text">
              A carteira “{roleConflict.label}” já é a {ROLE_LABEL[values.role].toLowerCase()}. Só existe uma de cada função: edite “
              {roleConflict.label}” antes de salvar esta com a mesma função.
            </p>
          ) : null}

          <Field label="Nome da carteira" hint="Como você reconhece esta carteira (até 32 caracteres)." error={errors.label} required>
            <Input name="label" maxLength={32} value={values.label} onChange={(e) => set('label', e.target.value)} />
          </Field>

          <Field label="Provedor" error={errors.provider} required>
            {(props) => (
              <Select value={values.provider} onValueChange={(v) => set('provider', v as WalletProvider)}>
                <SelectTrigger {...props} aria-label="Provedor">
                  <SelectValue placeholder="Escolha o provedor" />
                </SelectTrigger>
                <SelectContent>
                  {WalletProvider.options.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {WALLET_PROVIDER_LABEL[provider]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field label="Endereço" hint="0x seguido de 40 caracteres hexadecimais." error={errors.address} required>
            <Input
              name="address"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="font-mono text-sm"
              placeholder="0x0000000000000000000000000000000000000000"
              value={values.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </Field>

          {/* Grupo de checkboxes: fieldset/legend é a associação correta (um label/htmlFor não endereça um grupo). */}
          <fieldset
            aria-describedby={errors.networks ? networksErrorId : undefined}
            aria-invalid={errors.networks ? true : undefined}
            className="flex flex-col gap-2"
          >
            <legend className="mb-2 text-sm font-semibold text-foreground">Redes suportadas</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {Network.options.map((network) => {
                const id = `wallet-network-${network}`
                return (
                  <div key={network} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5">
                    <Checkbox
                      id={id}
                      checked={values.networks.includes(network)}
                      onCheckedChange={(checked) => toggleNetwork(network, checked === true)}
                    />
                    <Label htmlFor={id} className="cursor-pointer font-normal">
                      {NETWORK_LABEL[network]}
                    </Label>
                  </div>
                )
              })}
            </div>
            {errors.networks ? (
              <p id={networksErrorId} role="alert" className="text-sm font-medium text-destructive-text">
                {errors.networks}
              </p>
            ) : null}
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" data-testid="wallet-save" loading={save.isPending}>
              Salvar carteira
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

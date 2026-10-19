import * as React from 'react'
import { PasswordChangeInput } from '@/contracts'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAnnounce } from '@/components/ui/live-region'
import { useChangePassword } from '../hooks'
import { apiErrors, focusFirstInvalid, useFormState, zodErrors } from '../form'

export function PasswordForm() {
  const change = useChangePassword()
  const announce = useAnnounce()
  const formRef = React.useRef<HTMLFormElement>(null)
  const [done, setDone] = React.useState(false)
  const { values, setValues, set, errors, setErrors, formError, setFormError } = useFormState({
    currentPassword: '',
    newPassword: '',
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setDone(false)
    const parsed = PasswordChangeInput.safeParse(values)
    if (!parsed.success) {
      setErrors(zodErrors(parsed.error.issues))
      focusFirstInvalid(formRef.current)
      return
    }
    setErrors({})
    change.mutate(parsed.data, {
      onSuccess: () => {
        setValues({ currentPassword: '', newPassword: '' })
        setDone(true)
        announce('Senha alterada.')
      },
      onError: (error) => {
        // VALIDATION_ERROR com fields.currentPassword ("Senha atual incorreta").
        const { fields, message } = apiErrors(error, 'Não foi possível alterar a senha. Tente novamente.')
        setErrors(fields)
        setFormError(Object.keys(fields).length ? null : message)
        focusFirstInvalid(formRef.current)
        announce('Não foi possível alterar a senha.', 'assertive')
      },
    })
  }

  return (
    <form ref={formRef} data-testid="password-form" noValidate onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
      {formError ? (
        <p role="alert" className="rounded-xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive-text">
          {formError}
        </p>
      ) : null}
      {done ? (
        <p role="status" className="rounded-xl border border-success/60 bg-success/15 px-4 py-3 text-sm font-medium text-success-text">
          Senha alterada. As outras sessões foram encerradas.
        </p>
      ) : null}

      <Field label="Senha atual" error={errors.currentPassword} required>
        <Input
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={(e) => set('currentPassword', e.target.value)}
        />
      </Field>

      <Field label="Nova senha" hint="Pelo menos 8 caracteres, com uma letra e um número." error={errors.newPassword} required>
        <Input
          type="password"
          name="newPassword"
          autoComplete="new-password"
          value={values.newPassword}
          onChange={(e) => set('newPassword', e.target.value)}
        />
      </Field>

      <div>
        <Button type="submit" loading={change.isPending}>
          Alterar senha
        </Button>
      </div>
    </form>
  )
}

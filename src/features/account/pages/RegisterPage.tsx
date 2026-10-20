import * as React from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { RegisterInput } from '@/contracts'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAnnounce } from '@/components/ui/live-region'
import { PasswordInput } from '@/components/ui/password-input'
import { useRegister, useSession } from '@/features/session/session'
import { AuthModal } from '../components/AuthModal'
import { apiErrors, focusFirstInvalid, useFormState, zodErrors } from '../form'
import { useAfterAuthRedirect } from '../redirect'

const route = getRouteApi('/register')

export function RegisterPage() {
  const search = route.useSearch()
  const { isAuthenticated } = useSession()
  const register = useRegister()
  const announce = useAnnounce()
  const goBack = useAfterAuthRedirect()
  const formRef = React.useRef<HTMLFormElement>(null)
  const { values, set, errors, setErrors, formError, setFormError } = useFormState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  React.useEffect(() => {
    if (isAuthenticated) goBack(search.redirect)
  }, [isAuthenticated, search.redirect, goBack])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    // Confirmação de senha é só do cliente: o contrato não tem esse campo.
    if (values.password !== values.confirmPassword) {
      setErrors({ confirmPassword: 'As senhas não são iguais.' })
      focusFirstInvalid(formRef.current)
      return
    }

    const parsed = RegisterInput.safeParse(values)
    if (!parsed.success) {
      setErrors(zodErrors(parsed.error.issues))
      focusFirstInvalid(formRef.current)
      return
    }
    setErrors({})
    register.mutate(parsed.data, {
      onSuccess: () => announce('Conta criada. Bem-vindo ao marketplace.'),
      onError: (error) => {
        // 409 (EMAIL_TAKEN / CONFLICT) vem com `error.fields`: cai no campo certo.
        const { fields, message } = apiErrors(error, 'Não foi possível criar a conta. Tente novamente.')
        setErrors(fields)
        setFormError(Object.keys(fields).length ? null : message)
        focusFirstInvalid(formRef.current)
      },
    })
  }

  return (
    <AuthModal mode="register" redirect={search.redirect} subtitle="Crie seu perfil de colecionador e conecte uma carteira quando quiser.">
      <form ref={formRef} data-testid="register-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError ? (
          <p
            data-testid="register-error"
            role="alert"
            className="rounded-xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive-text"
          >
            {formError}
          </p>
        ) : null}

        {/* O Figma não tem este campo, mas o contrato de cadastro exige nome
            completo além do nome de usuário; omiti-lo quebraria o cadastro
            de verdade. */}
        <Field label="Nome completo" hideLabel error={errors.name} required>
          <Input name="name" autoComplete="name" placeholder="Nome completo" value={values.name} onChange={(e) => set('name', e.target.value)} />
        </Field>

        <Field label="Nome de usuário" hideLabel hint="Letras minúsculas, números e _ (3 a 24 caracteres)." error={errors.username} required>
          <Input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Nome de usuário"
            value={values.username}
            onChange={(e) => set('username', e.target.value)}
          />
        </Field>

        <Field label="E-mail" hideLabel error={errors.email} required>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="Digite seu e-mail"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>

        <Field label="Senha" hideLabel hint="Pelo menos 8 caracteres, com uma letra e um número." error={errors.password} required>
          {(controlProps) => (
            <PasswordInput
              {...controlProps}
              name="password"
              autoComplete="new-password"
              placeholder="Senha"
              value={values.password}
              onChange={(e) => set('password', e.target.value)}
            />
          )}
        </Field>

        <Field label="Confirmar senha" hideLabel error={errors.confirmPassword} required>
          {(controlProps) => (
            <PasswordInput
              {...controlProps}
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Confirmar senha"
              value={values.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
            />
          )}
        </Field>

        <Button type="submit" size="lg" loading={register.isPending} className="mt-1 w-full">
          Criar conta
        </Button>
      </form>
    </AuthModal>
  )
}

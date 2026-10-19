import * as React from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { RegisterInput } from '@/contracts'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAnnounce } from '@/components/ui/live-region'
import { useRegister, useSession } from '@/features/session/session'
import { AuthLayout } from '../components/AuthLayout'
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
  })

  React.useEffect(() => {
    if (isAuthenticated) goBack(search.redirect)
  }, [isAuthenticated, search.redirect, goBack])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
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
    <AuthLayout
      title="Criar conta"
      description="Leva menos de um minuto. Seu carrinho de visitante é mantido."
      footer={
        <>
          Já tem conta?{' '}
          <Link
            to="/login"
            search={{ redirect: search.redirect }}
            className="font-semibold text-accent-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Entrar
          </Link>
        </>
      }
    >
      <form ref={formRef} data-testid="register-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        {formError ? (
          <p
            data-testid="register-error"
            role="alert"
            className="rounded-xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive-text"
          >
            {formError}
          </p>
        ) : null}

        <Field label="Nome" error={errors.name} required>
          <Input name="name" autoComplete="name" value={values.name} onChange={(e) => set('name', e.target.value)} />
        </Field>

        <Field
          label="Nome de usuário"
          hint="Letras minúsculas, números e _ (3 a 24 caracteres)."
          error={errors.username}
          required
        >
          <Input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={values.username}
            onChange={(e) => set('username', e.target.value)}
          />
        </Field>

        <Field label="E-mail" error={errors.email} required>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="voce@exemplo.com"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>

        <Field
          label="Senha"
          hint="Pelo menos 8 caracteres, com uma letra e um número."
          error={errors.password}
          required
        >
          <Input
            type="password"
            name="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => set('password', e.target.value)}
          />
        </Field>

        <Button type="submit" size="lg" loading={register.isPending} className="w-full">
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  )
}

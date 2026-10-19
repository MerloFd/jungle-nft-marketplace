import * as React from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { LoginInput } from '@/contracts'
import { isApiError } from '@/lib/http'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAnnounce } from '@/components/ui/live-region'
import { useLogin, useSession } from '@/features/session/session'
import { AuthLayout } from '../components/AuthLayout'
import { apiErrors, focusFirstInvalid, useFormState, zodErrors } from '../form'
import { useAfterAuthRedirect } from '../redirect'

const route = getRouteApi('/login')

export function LoginPage() {
  const search = route.useSearch()
  const { isAuthenticated } = useSession()
  const login = useLogin()
  const announce = useAnnounce()
  const goBack = useAfterAuthRedirect()
  const formRef = React.useRef<HTMLFormElement>(null)
  const { values, set, errors, setErrors, formError, setFormError } = useFormState({ email: '', password: '' })

  // Já autenticado (inclusive logo após o login): retoma o fluxo interrompido.
  React.useEffect(() => {
    if (isAuthenticated) goBack(search.redirect)
  }, [isAuthenticated, search.redirect, goBack])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = LoginInput.safeParse(values)
    if (!parsed.success) {
      setErrors(zodErrors(parsed.error.issues))
      focusFirstInvalid(formRef.current)
      return
    }
    setErrors({})
    login.mutate(parsed.data, {
      onSuccess: () => announce('Você entrou na sua conta.'),
      onError: (error) => {
        const { fields, message } = apiErrors(error, 'Não foi possível entrar. Tente novamente.')
        setErrors(fields)
        // Não revelamos qual dos dois campos está errado.
        setFormError(isApiError(error) && error.code === 'INVALID_CREDENTIALS' ? 'E-mail ou senha incorretos.' : message)
        focusFirstInvalid(formRef.current)
      },
    })
  }

  return (
    <AuthLayout
      title="Entrar"
      description="Acesse sua conta para favoritar NFTs, usar o carrinho e finalizar compras."
      notice={
        search.reason === 'expired' ? (
          <p
            data-testid="login-expired-notice"
            role="status"
            className="rounded-xl border border-warning/60 bg-warning/15 px-4 py-3 text-sm font-medium text-warning-text"
          >
            Sua sessão expirou. Entre novamente para continuar de onde parou.
          </p>
        ) : null
      }
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link
            to="/register"
            search={{ redirect: search.redirect }}
            className="font-semibold text-accent-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Criar conta
          </Link>
        </>
      }
    >
      <form ref={formRef} data-testid="login-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        {formError ? (
          <p
            data-testid="login-error"
            role="alert"
            className="rounded-xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive-text"
          >
            {formError}
          </p>
        ) : null}

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

        <Field label="Senha" error={errors.password} required>
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(e) => set('password', e.target.value)}
          />
        </Field>

        <Button type="submit" size="lg" loading={login.isPending} className="w-full">
          Entrar
        </Button>

        <p className="text-sm text-muted-foreground">
          Ambiente de demonstração: use <strong className="font-semibold text-foreground">ana@jungle.dev</strong> com a senha{' '}
          <strong className="font-semibold text-foreground">jungle123</strong>.
        </p>
      </form>
    </AuthLayout>
  )
}

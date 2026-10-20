import * as React from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { LoginInput } from '@/contracts'
import { isApiError } from '@/lib/http'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAnnounce } from '@/components/ui/live-region'
import { PasswordInput } from '@/components/ui/password-input'
import { useLogin, useSession } from '@/features/session/session'
import { AuthModal } from '../components/AuthModal'
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
    <AuthModal mode="login" redirect={search.redirect} subtitle="Entre para gerenciar sua carteira, coleção e perfil de criador.">
      <form ref={formRef} data-testid="login-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {search.reason === 'expired' ? (
          <p
            data-testid="login-expired-notice"
            role="status"
            className="rounded-xl border border-warning/60 bg-warning/15 px-4 py-3 text-sm font-medium text-warning-text"
          >
            Sua sessão expirou. Entre novamente para continuar de onde parou.
          </p>
        ) : null}

        {formError ? (
          <p
            data-testid="login-error"
            role="alert"
            className="rounded-xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive-text"
          >
            {formError}
          </p>
        ) : null}

        <Field label="E-mail" hideLabel error={errors.email} required>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="contato@email.com"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <Field label="Senha" hideLabel error={errors.password} required>
            {(controlProps) => (
              <PasswordInput
                {...controlProps}
                name="password"
                autoComplete="current-password"
                placeholder="Senha"
                value={values.password}
                onChange={(e) => set('password', e.target.value)}
              />
            )}
          </Field>
          <span aria-disabled="true" className="cursor-not-allowed self-end text-sm text-muted-foreground">
            Esqueceu a senha?
            <span className="sr-only"> (indisponível nesta demonstração)</span>
          </span>
        </div>

        <Button type="submit" size="lg" loading={login.isPending} className="mt-1 w-full">
          Entrar
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Demonstração: <strong className="font-semibold text-foreground">ana@jungle.dev</strong> /{' '}
          <strong className="font-semibold text-foreground">jungle123</strong>
        </p>
      </form>
    </AuthModal>
  )
}

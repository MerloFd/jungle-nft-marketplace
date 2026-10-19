import * as React from 'react'
import { ProfileUpdateInput, type User } from '@/contracts'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAnnounce } from '@/components/ui/live-region'
import { useUpdateProfile } from '../hooks'
import { apiErrors, focusFirstInvalid, useFormState, zodErrors } from '../form'

const BIO_MAX = 280

export function ProfileDataForm({ user }: { user: User }) {
  const update = useUpdateProfile()
  const announce = useAnnounce()
  const formRef = React.useRef<HTMLFormElement>(null)
  const { values, setValues, set, errors, setErrors, formError, setFormError } = useFormState({
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio,
  })

  // Dados vindos da API são a fonte da verdade: ressincroniza quando o usuário muda.
  const syncedId = React.useRef(user.id)
  React.useEffect(() => {
    if (syncedId.current === user.id) return
    syncedId.current = user.id
    setValues({ name: user.name, username: user.username, email: user.email, bio: user.bio })
  }, [user, setValues])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = ProfileUpdateInput.safeParse(values)
    if (!parsed.success) {
      setErrors(zodErrors(parsed.error.issues))
      focusFirstInvalid(formRef.current)
      return
    }
    setErrors({})
    update.mutate(parsed.data, {
      onSuccess: () => announce('Perfil atualizado.'),
      onError: (error) => {
        // 409 de e-mail/username em uso chega com `fields`.
        const { fields, message } = apiErrors(error, 'Não foi possível salvar o perfil. Tente novamente.')
        setErrors(fields)
        setFormError(Object.keys(fields).length ? null : message)
        focusFirstInvalid(formRef.current)
        announce('Não foi possível salvar o perfil.', 'assertive')
      },
    })
  }

  const remaining = BIO_MAX - values.bio.length

  return (
    <form ref={formRef} data-testid="profile-form" noValidate onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
      {formError ? (
        <p role="alert" className="rounded-xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive-text">
          {formError}
        </p>
      ) : null}

      <Field label="Nome" error={errors.name} required>
        <Input name="name" autoComplete="name" value={values.name} onChange={(e) => set('name', e.target.value)} />
      </Field>

      <Field label="Nome de usuário" hint="Letras minúsculas, números e _ (3 a 24 caracteres)." error={errors.username} required>
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
        <Input type="email" name="email" autoComplete="email" inputMode="email" value={values.email} onChange={(e) => set('email', e.target.value)} />
      </Field>

      <Field
        label="Bio"
        hint={`${values.bio.length}/${BIO_MAX} caracteres`}
        error={errors.bio}
      >
        <Textarea
          name="bio"
          maxLength={BIO_MAX}
          placeholder="Conte em poucas palavras o que você coleciona."
          value={values.bio}
          onChange={(e) => set('bio', e.target.value)}
        />
      </Field>
      {/* Contador visível e anunciado só perto do limite, para não poluir a leitura. */}
      <p aria-live="polite" className="-mt-3 text-sm text-muted-foreground">
        {remaining <= 20 ? `Restam ${remaining} caracteres.` : ''}
      </p>

      <div>
        <Button type="submit" loading={update.isPending}>
          Salvar alterações
        </Button>
      </div>
    </form>
  )
}

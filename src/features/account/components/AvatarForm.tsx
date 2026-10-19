import * as React from 'react'
import { AvatarUpdateInput, type User } from '@/contracts'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAnnounce } from '@/components/ui/live-region'
import { useUpdateAvatar } from '../hooks'
import { apiErrors } from '../form'
import { AVATAR_ACCEPT_ATTR, AVATAR_MAX_SIDE, ImageError, resizeAvatarToDataUrl } from '../image'

export function AvatarForm({ user }: { user: User }) {
  const update = useUpdateAvatar()
  const announce = useAnnounce()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [processing, setProcessing] = React.useState(false)

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setError(null)
    setPreview(null)
    if (!file) return
    setProcessing(true)
    try {
      const dataUrl = await resizeAvatarToDataUrl(file)
      // Garante que o que vamos enviar passa no schema do contrato.
      const parsed = AvatarUpdateInput.safeParse({ dataUrl })
      if (!parsed.success) throw new ImageError(parsed.error.issues[0]?.message ?? 'Formato de imagem não suportado')
      setPreview(parsed.data.dataUrl)
      announce('Pré-visualização do novo avatar pronta. Salve para confirmar.')
    } catch (e) {
      setError(e instanceof ImageError ? e.message : 'Não foi possível preparar a imagem. Tente outro arquivo.')
    } finally {
      setProcessing(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!preview) return
    setError(null)
    update.mutate(
      { dataUrl: preview },
      {
        onSuccess: () => {
          setPreview(null)
          if (inputRef.current) inputRef.current.value = ''
          announce('Avatar atualizado.')
        },
        onError: (e) => {
          const { fields, message } = apiErrors(e, 'Não foi possível salvar o avatar. Tente novamente.')
          setError(fields.dataUrl ?? message)
          announce('Não foi possível salvar o avatar.', 'assertive')
        },
      },
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
      <div className="flex items-center gap-4">
        <img
          src={preview ?? user.avatarUrl}
          alt={preview ? 'Pré-visualização do novo avatar' : `Avatar atual de ${user.name}`}
          data-testid={preview ? 'avatar-preview' : undefined}
          width={96}
          height={96}
          className="size-24 shrink-0 rounded-full border border-border bg-background object-cover"
        />
        <p className="text-sm text-muted-foreground">
          A imagem é reduzida para {AVATAR_MAX_SIDE}px no maior lado antes do envio, mantendo a proporção.
        </p>
      </div>

      <Field label="Escolher imagem" hint="PNG, JPEG ou WebP, até 8MB." error={error}>
        <Input
          ref={inputRef}
          data-testid="avatar-input"
          type="file"
          accept={AVATAR_ACCEPT_ATTR}
          className="h-auto py-2.5"
          onChange={(e) => void handleFile(e)}
        />
      </Field>

      <div>
        <Button type="submit" data-testid="avatar-save" disabled={!preview || processing} loading={update.isPending}>
          Salvar avatar
        </Button>
      </div>
    </form>
  )
}

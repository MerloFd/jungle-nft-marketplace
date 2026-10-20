import * as React from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const DEBOUNCE_MS = 350

export interface CatalogSearchFieldProps {
  /** Valor atual na URL (fonte da verdade). */
  value: string
  onCommit: (value: string | undefined) => void
}

/**
 * Busca com debounce. O input é controlado localmente para a digitação não
 * disparar uma requisição por tecla; a URL continua sendo a fonte da verdade
 * (colar uma URL com ?q= já preenche o campo, e voltar no histórico ressincroniza).
 */
export function CatalogSearchField({ value, onCommit }: CatalogSearchFieldProps) {
  const [draft, setDraft] = React.useState(value)
  const lastSent = React.useRef(value)

  React.useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value
      setDraft(value)
    }
  }, [value])

  React.useEffect(() => {
    if (draft === lastSent.current) return
    const timer = window.setTimeout(() => {
      lastSent.current = draft
      onCommit(draft.trim() || undefined)
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft, onCommit])

  const commitNow = (next: string) => {
    lastSent.current = next
    setDraft(next)
    onCommit(next.trim() || undefined)
  }

  return (
    <Field label="Buscar NFTs" hideLabel className="min-w-0 w-full flex-1">
      {(controlProps) => (
        <div className="relative flex w-full items-center">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 size-5 text-muted-foreground" />
          <Input
            {...controlProps}
            data-testid="catalog-search"
            type="search"
            autoComplete="off"
            placeholder="Buscar por nome, coleção, criador ou tag"
            className="pl-12 pr-12"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitNow(draft)
              }
            }}
          />
          {draft ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Limpar busca"
              className="absolute right-1 size-10"
              onClick={() => commitNow('')}
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      )}
    </Field>
  )
}

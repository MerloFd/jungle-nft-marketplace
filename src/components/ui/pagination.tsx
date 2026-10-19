import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PaginationLinkProps {
  className: string
  children: React.ReactNode
  'aria-label': string
  'aria-current'?: 'page'
}

export interface PaginationProps {
  page: number
  totalPages: number
  /** Usado quando `renderLink` não é passado: renderiza <button>. */
  onPageChange?: (page: number) => void
  /**
   * Render prop para links reais (ex.: Link do TanStack Router com search={{ page }}).
   * Recebe a página alvo e as props de estilo/acessibilidade que devem ir no elemento.
   */
  renderLink?: (page: number, props: PaginationLinkProps) => React.ReactNode
  /** Quantas páginas mostrar ao redor da atual. */
  siblings?: number
  className?: string
}

type PageToken = number | 'ellipsis-start' | 'ellipsis-end'

export function getPageTokens(page: number, totalPages: number, siblings = 1): PageToken[] {
  const total = siblings * 2 + 5
  if (totalPages <= total) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const start = Math.max(2, page - siblings)
  const end = Math.min(totalPages - 1, page + siblings)
  const tokens: PageToken[] = [1]
  if (start > 2) tokens.push('ellipsis-start')
  for (let p = start; p <= end; p++) tokens.push(p)
  if (end < totalPages - 1) tokens.push('ellipsis-end')
  tokens.push(totalPages)
  return tokens
}

const itemBase =
  'inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-xl px-3 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
const itemIdle = 'bg-card text-foreground hover:bg-accent'
const itemActive = 'bg-primary text-primary-foreground'
const itemDisabled = 'pointer-events-none opacity-40 bg-card text-foreground'

export function Pagination({ page, totalPages, onPageChange, renderLink, siblings = 1, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const renderItem = (target: number, label: string, content: React.ReactNode, opts: { current?: boolean } = {}) => {
    const props: PaginationLinkProps = {
      className: cn(itemBase, opts.current ? itemActive : itemIdle),
      children: content,
      'aria-label': label,
      'aria-current': opts.current ? 'page' : undefined,
    }
    if (renderLink) return renderLink(target, props)
    return (
      <button type="button" {...props} onClick={() => onPageChange?.(target)}>
        {content}
      </button>
    )
  }

  const prevDisabled = page <= 1
  const nextDisabled = page >= totalPages

  return (
    <nav aria-label="Paginação" className={cn('flex justify-center', className)}>
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          {prevDisabled ? (
            <span aria-disabled="true" className={cn(itemBase, itemDisabled)}>
              <ChevronLeft aria-hidden="true" className="size-5" />
              <span className="sr-only">Página anterior</span>
            </span>
          ) : (
            renderItem(page - 1, 'Página anterior', <ChevronLeft aria-hidden="true" className="size-5" />)
          )}
        </li>
        {getPageTokens(page, totalPages, siblings).map((token) =>
          typeof token === 'number' ? (
            <li key={token}>{renderItem(token, `Página ${token}`, token, { current: token === page })}</li>
          ) : (
            <li key={token} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </li>
          ),
        )}
        <li>
          {nextDisabled ? (
            <span aria-disabled="true" className={cn(itemBase, itemDisabled)}>
              <ChevronRight aria-hidden="true" className="size-5" />
              <span className="sr-only">Próxima página</span>
            </span>
          ) : (
            renderItem(page + 1, 'Próxima página', <ChevronRight aria-hidden="true" className="size-5" />)
          )}
        </li>
      </ul>
    </nav>
  )
}

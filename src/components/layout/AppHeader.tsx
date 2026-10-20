import * as React from 'react'
import { LogOut, Menu, Search, ShoppingCart, User as UserIcon, Wallet, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { PageContainer } from './PageContainer'

export type RenderLink = (to: string, children: React.ReactNode, className?: string) => React.ReactNode

export interface AppHeaderUser {
  name: string
  avatarUrl: string
}

export interface AppHeaderProps {
  cartCount: number
  user: AppHeaderUser | null
  onLogout: () => void
  /** Plugue o Link do router aqui, ex.: (to, c, cls) => <Link to={to} className={cls}>{c}</Link> */
  renderLink: RenderLink
  /** Mostra estado de carregamento da sessão (evita piscar "Entrar"). */
  sessionLoading?: boolean
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

const navItem = cn(
  'inline-flex min-h-11 items-center border-b-2 border-transparent px-1 text-base font-medium text-foreground transition-colors',
  'hover:text-accent-text aria-[current=page]:border-primary aria-[current=page]:text-primary',
  focusRing,
)

const iconAction = cn(
  'inline-flex size-11 items-center justify-center rounded-sm text-foreground transition-colors hover:bg-accent',
  focusRing,
)

/** Botão primário do Figma: 35px de altura, raio 6px e rótulo 16 medium sobre o âmbar. */
const primaryAction = cn(
  'inline-flex h-11 items-center gap-2 rounded-sm bg-primary px-5 text-base font-medium text-primary-foreground transition-colors hover:bg-primary-hover md:h-[35px]',
  focusRing,
)

export function Logo({ renderLink }: { renderLink: RenderLink }) {
  return (
    <span onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      {renderLink(
        '/',
        <span className="text-xl font-bold uppercase tracking-[0.2em] md:text-2xl">Kurio</span>,
        cn('inline-flex min-h-11 items-center text-foreground', focusRing),
      )}
    </span>
  )
}


/**
 * O cabeçalho do Figma traz quatro itens, mas o enunciado não entrega as telas
 * de Criadores e Aprenda e proíbe que ação fora de escopo aparente funcionar.
 * O item aparece, mantendo a composição, e se declara indisponível.
 */
function NavItemForaDeEscopo({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span aria-disabled="true" className={cn(navItem, 'cursor-not-allowed text-muted-foreground hover:text-muted-foreground', className)}>
      {children}
      <span className="sr-only"> (não faz parte desta entrega)</span>
    </span>
  )
}

function CartLink({ count, renderLink, className }: { count: number; renderLink: RenderLink; className?: string }) {
  const label = count === 1 ? 'Carrinho, 1 item' : `Carrinho, ${count} itens`
  return renderLink(
    '/cart',
    <>
      <ShoppingCart aria-hidden="true" className="size-5" />
      {count > 0 ? (
        <span
          aria-hidden="true"
          data-testid="cart-count"
          className="absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] font-bold leading-4 text-primary-foreground"
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
      <span className="sr-only">{label}</span>
    </>,
    cn(iconAction, 'relative', className),
  )
}

function Avatar({ user }: { user: AppHeaderUser }) {
  return (
    <img
      src={user.avatarUrl}
      alt=""
      width={32}
      height={32}
      className="size-8 shrink-0 rounded-full bg-card object-cover"
    />
  )
}

function SearchToggle({ open, onToggle }: { open: boolean; onToggle: (next: boolean) => void }) {
  return (
    <button
      type="button"
      className={iconAction}
      aria-label={open ? 'Fechar busca' : 'Buscar NFTs'}
      aria-expanded={open}
      aria-controls="header-search"
      onClick={() => onToggle(!open)}
    >
      {open ? <X aria-hidden="true" className="size-5" /> : <Search aria-hidden="true" className="size-5" />}
    </button>
  )
}

/**
 * Busca do cabeçalho: formulário GET para `/`, que navega de verdade para
 * `/?q=…` sem depender do router (a home lê `q` da URL).
 */
function HeaderSearchForm({ open }: { open: boolean }) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  return (
    <form
      id="header-search"
      action="/"
      method="get"
      role="search"
      hidden={!open}
      className="flex items-center gap-2 pb-4 md:ml-auto md:max-w-md"
    >
      <label htmlFor="header-search-input" className="sr-only">
        Buscar NFTs no mercado
      </label>
      <input
        ref={inputRef}
        id="header-search-input"
        name="q"
        type="search"
        autoComplete="off"
        placeholder="Buscar por nome, coleção ou criador"
        className={cn(
          'h-11 w-full min-w-0 rounded-sm border border-input bg-card px-4 text-base text-foreground placeholder:text-muted-foreground',
          'focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      />
      <button type="submit" className={cn(primaryAction, 'h-11 shrink-0 md:h-11')}>
        Buscar
      </button>
    </form>
  )
}


/** Acompanha se a seção #catalogo está na tela, para destacar "Mercado" ao rolar até ela. */
function useCatalogSectionVisible() {
  const [visible, setVisible] = React.useState(false)
  React.useEffect(() => {
    const el = document.getElementById('catalogo')
    if (!el) {
      setVisible(false)
      return
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '-96px 0px -70% 0px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return visible
}

export function AppHeader({ cartCount, user, onLogout, renderLink, sessionLoading }: AppHeaderProps) {
  const catalogVisible = useCatalogSectionVisible()
  const [open, setOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <PageContainer>
        <div className="flex h-[72px] items-center gap-4 md:h-[88px]">
          <Logo renderLink={renderLink} />

          <nav aria-label="Principal" className="mx-auto hidden items-center gap-10 lg:flex">
            {renderLink('/', 'Início', catalogVisible ? cn(navItem, '!border-transparent !text-foreground') : navItem)}
            <a href="/#catalogo" aria-current={catalogVisible ? 'page' : undefined} className={navItem}>
              Mercado
            </a>
            <NavItemForaDeEscopo>Criadores</NavItemForaDeEscopo>
            <NavItemForaDeEscopo>Aprenda</NavItemForaDeEscopo>
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <SearchToggle open={searchOpen} onToggle={setSearchOpen} />
            <CartLink count={cartCount} renderLink={renderLink} />

            {sessionLoading ? (
              <span className="ml-2 hidden h-[35px] w-24 rounded-sm shimmer lg:inline-block" aria-hidden="true" />
            ) : user ? (
              <div className="hidden items-center gap-1 lg:flex">
                {renderLink(
                  '/account/profile',
                  <>
                    <Avatar user={user} />
                    <span className="max-w-[9rem] truncate text-base font-medium">{user.name}</span>
                  </>,
                  cn('inline-flex min-h-11 items-center gap-2 rounded-sm px-2 text-foreground hover:bg-accent', focusRing),
                )}
                {renderLink(
                  '/account/wallets',
                  <>
                    <Wallet aria-hidden="true" className="size-5" />
                    <span className="sr-only">Carteiras</span>
                  </>,
                  iconAction,
                )}
                <button type="button" className={iconAction} aria-label="Sair" onClick={onLogout}>
                  <LogOut aria-hidden="true" className="size-5" />
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 lg:flex">
                {renderLink(
                  '/login',
                  <>
                    <UserIcon aria-hidden="true" className="size-5" />
                    Entrar
                  </>,
                  cn(primaryAction, 'ml-2'),
                )}
              </div>
            )}

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu" className="rounded-sm lg:hidden">
                  <Menu aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription className="sr-only">Navegação principal</SheetDescription>
                </SheetHeader>
                <nav
                  aria-label="Menu móvel"
                  onClick={(e) => {
                    // Fecha o menu ao seguir qualquer link.
                    if ((e.target as HTMLElement).closest('a')) close()
                  }}
                >
                  <ul className="flex flex-col gap-1">
                    {user ? (
                      <li className="mb-2 flex items-center gap-3 px-2 py-2">
                        <Avatar user={user} />
                        <span className="truncate font-semibold">{user.name}</span>
                      </li>
                    ) : null}
                    <li>{renderLink('/', 'Início', catalogVisible ? cn(navItem, 'w-full border-b-0 !border-transparent !text-foreground') : cn(navItem, 'w-full border-b-0'))}</li>
                    <li>
                      <a href="/#catalogo" aria-current={catalogVisible ? 'page' : undefined} className={cn(navItem, 'w-full border-b-0')}>
                        Mercado
                      </a>
                    </li>
                    <li><NavItemForaDeEscopo className="w-full border-b-0">Criadores</NavItemForaDeEscopo></li>
                    <li><NavItemForaDeEscopo className="w-full border-b-0">Aprenda</NavItemForaDeEscopo></li>
                    <li>
                      {renderLink(
                        '/cart',
                        <>
                          <ShoppingCart aria-hidden="true" className="size-5" />
                          Carrinho
                        </>,
                        cn(navItem, 'w-full gap-2 border-b-0'),
                      )}
                    </li>
                    {user ? (
                      <>
                        <li>
                          {renderLink(
                            '/account/profile',
                            <>
                              <UserIcon aria-hidden="true" className="size-5" />
                              Meu perfil
                            </>,
                            cn(navItem, 'w-full gap-2 border-b-0'),
                          )}
                        </li>
                        <li>
                          {renderLink(
                            '/account/wallets',
                            <>
                              <Wallet aria-hidden="true" className="size-5" />
                              Carteiras
                            </>,
                            cn(navItem, 'w-full gap-2 border-b-0'),
                          )}
                        </li>
                        <li>
                          <Button
                            variant="ghost"
                            className="w-full justify-start px-1"
                            onClick={() => {
                              close()
                              onLogout()
                            }}
                          >
                            <LogOut aria-hidden="true" />
                            Sair
                          </Button>
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="mt-2">{renderLink('/login', 'Entrar', cn(primaryAction, 'w-full justify-center'))}</li>
                        <li>{renderLink('/register', 'Cadastrar', cn(navItem, 'w-full border-b-0'))}</li>
                      </>
                    )}
                  </ul>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <HeaderSearchForm open={searchOpen} />

        {/* Figma: divisor de 0.3px na cor primária, com a largura do conteúdo. */}
        <div aria-hidden="true" className="h-px bg-primary/40" />
      </PageContainer>
    </header>
  )
}

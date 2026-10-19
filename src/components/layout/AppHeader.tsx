import * as React from 'react'
import { LogOut, Menu, ShoppingCart, Store, User as UserIcon, Wallet } from 'lucide-react'
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

const navLink =
  'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export function Logo({ renderLink }: { renderLink: RenderLink }) {
  return renderLink(
    '/',
    <>
      <Store aria-hidden="true" className="size-8 text-brand" />
      <span className="font-mono text-lg font-bold md:text-xl">NFT Marketplace</span>
    </>,
    'inline-flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  )
}

function CartLink({ count, renderLink, className }: { count: number; renderLink: RenderLink; className?: string }) {
  const label = count === 1 ? 'Carrinho, 1 item' : `Carrinho, ${count} itens`
  return renderLink(
    '/cart',
    <>
      <span className="relative inline-flex">
        <ShoppingCart aria-hidden="true" className="size-5" />
        {count > 0 ? (
          <span
            aria-hidden="true"
            data-testid="cart-count"
            className="absolute -right-2.5 -top-2.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground"
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </span>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="hidden lg:inline">
        Carrinho
      </span>
    </>,
    cn(navLink, className),
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

export function AppHeader({ cartCount, user, onLogout, renderLink, sessionLoading }: AppHeaderProps) {
  const [open, setOpen] = React.useState(false)
  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <PageContainer className="flex h-[72px] items-center justify-between gap-4 md:h-[88px]">
        <Logo renderLink={renderLink} />

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {renderLink('/', 'Marketplace', navLink)}
          <CartLink count={cartCount} renderLink={renderLink} />
          {sessionLoading ? (
            <span className="ml-2 inline-block h-11 w-32 rounded-xl shimmer" aria-hidden="true" />
          ) : user ? (
            <>
              {renderLink('/account/wallets', <><Wallet aria-hidden="true" className="size-5" />Carteiras</>, navLink)}
              {renderLink(
                '/account/profile',
                <>
                  <Avatar user={user} />
                  <span className="max-w-[10rem] truncate">{user.name}</span>
                </>,
                navLink,
              )}
              <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Sair">
                <LogOut aria-hidden="true" />
              </Button>
            </>
          ) : (
            <>
              {renderLink('/login', 'Entrar', navLink)}
              {renderLink(
                '/register',
                <>
                  <UserIcon aria-hidden="true" className="size-5" />
                  Cadastrar
                </>,
                cn(navLink, 'bg-primary text-primary-foreground hover:bg-primary-hover'),
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-1 lg:hidden">
          <CartLink count={cartCount} renderLink={renderLink} className="px-3" />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">Navegação principal</SheetDescription>
              </SheetHeader>
              <nav aria-label="Menu móvel" onClick={(e) => {
                // Fecha o menu ao seguir qualquer link.
                if ((e.target as HTMLElement).closest('a')) close()
              }}>
                <ul className="flex flex-col gap-1">
                  {user ? (
                    <li className="mb-2 flex items-center gap-3 px-4 py-2">
                      <Avatar user={user} />
                      <span className="truncate font-semibold">{user.name}</span>
                    </li>
                  ) : null}
                  <li>{renderLink('/', <><Store aria-hidden="true" className="size-5" />Marketplace</>, cn(navLink, 'w-full'))}</li>
                  <li>
                    <CartLink count={cartCount} renderLink={renderLink} className="w-full [&>span:last-child]:inline" />
                  </li>
                  {user ? (
                    <>
                      <li>{renderLink('/account/profile', <><UserIcon aria-hidden="true" className="size-5" />Meu perfil</>, cn(navLink, 'w-full'))}</li>
                      <li>{renderLink('/account/wallets', <><Wallet aria-hidden="true" className="size-5" />Carteiras</>, cn(navLink, 'w-full'))}</li>
                      <li>
                        <Button
                          variant="ghost"
                          className="w-full justify-start px-4"
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
                      <li>{renderLink('/login', 'Entrar', cn(navLink, 'w-full'))}</li>
                      <li>{renderLink('/register', 'Cadastrar', cn(navLink, 'w-full bg-primary text-primary-foreground hover:bg-primary-hover'))}</li>
                    </>
                  )}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </PageContainer>
    </header>
  )
}

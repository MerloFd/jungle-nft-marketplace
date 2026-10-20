import { useEffect } from 'react'
import { createRootRouteWithContext, Link, Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '@/components/layout/AppHeader'
import { AppFooter } from '@/components/layout/AppFooter'
import { SkipLink } from '@/components/layout/SkipLink'
import { Toaster, toast } from '@/components/ui/toaster'
import { LiveRegionProvider } from '@/components/ui/live-region'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { ConnectionBanner } from '@/components/app/ConnectionBanner'
import { MockPanel } from '@/components/app/MockPanel'
import { sessionEvents } from '@/lib/http'
import { handleSessionLost, useLogout, useSession } from '@/features/session/session'
import { useCartCount } from '@/features/cart/hooks'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => <NotFoundPage />,
})

/** Ao perder a sessão (401), encerra localmente e, se a rota for privada, leva ao login preservando o destino. */
function SessionWatcher() {
  const qc = useQueryClient()
  const router = useRouter()
  useEffect(
    () =>
      sessionEvents.on((e) => {
        handleSessionLost(qc)
        const { location, matches } = router.state
        const isPrivate = matches.some((m) => m.routeId.startsWith('/_authenticated'))
        toast.error(e.type === 'expired' ? 'Sua sessão expirou. Entre novamente para continuar.' : 'Sua sessão não é mais válida.')
        if (isPrivate) {
          void router.navigate({ to: '/login', search: { redirect: location.href, reason: 'expired' }, replace: true })
        }
      }),
    [qc, router],
  )
  return null
}

function RootLayout() {
  const { user, isPending } = useSession()
  const cartCount = useCartCount()
  const logout = useLogout()
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Move o foco para o conteúdo ao trocar de página (leitores de tela).
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <LiveRegionProvider>
      <RealtimeProvider>
        <SessionWatcher />
        <SkipLink />
        <div className="flex min-h-dvh flex-col">
          <AppHeader
            cartCount={cartCount}
            user={user ? { name: user.name, avatarUrl: user.avatarUrl } : null}
            sessionLoading={isPending}
            onLogout={() =>
              logout.mutate(undefined, {
                onSettled: () => {
                  toast.success('Você saiu da sua conta.')
                  void router.navigate({ to: '/' })
                },
              })
            }
            renderLink={(to, children, className, forceInactive) =>
              // O Link do TanStack marca aria-current="page" de forma incondicional
              // sempre que a rota bate (ver applyLinkState em @tanstack/react-router),
              // sem opção de desligar via props. Quando a tela precisa que este item
              // NÃO pareça atual (ex.: "Início" enquanto o scroll-spy mostra outra
              // seção ativa), troca para uma âncora simples com navegação manual, que
              // não passa pela lógica de link ativo da rota.
              forceInactive ? (
                <a
                  href={to}
                  className={className}
                  onClick={(e) => {
                    e.preventDefault()
                    void router.navigate({ href: to })
                  }}
                >
                  {children}
                </a>
              ) : (
                <Link to={to} className={className} activeProps={{ 'aria-current': 'page' }}>
                  {children}
                </Link>
              )
            }
          />
          <ConnectionBanner />
          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            <Outlet />
          </main>
          <AppFooter />
        </div>
        <Toaster />
        <MockPanel />
      </RealtimeProvider>
    </LiveRegionProvider>
  )
}

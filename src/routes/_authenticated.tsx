import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionQueryOptions, useSession } from '@/features/session/session'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { user: session.user }
  },
  component: AuthenticatedLayout,
})

/**
 * O beforeLoad só roda na próxima navegação, então sair da conta estando numa
 * tela privada deixaria o conteúdo montado. Aqui o conteúdo some na hora; quem
 * navega é o fluxo que encerrou a sessão (logout no cabeçalho, ou o
 * SessionWatcher no caso de 401, que leva ao login preservando o destino).
 */
function AuthenticatedLayout() {
  const { isAuthenticated, isPending } = useSession()
  if (!isPending && !isAuthenticated) return null
  return <Outlet />
}

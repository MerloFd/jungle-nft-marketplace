import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/features/session/session'

/** Layout das rotas privadas: checkout, pedidos, perfil e carteiras. */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { user: session.user }
  },
  component: Outlet,
})

import { createRouter } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import { NotFoundPage } from '@/components/app/NotFoundPage'

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    // O TanStack Query cuida do cache; o router não guarda dados próprios.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultNotFoundComponent: () => <NotFoundPage />,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}

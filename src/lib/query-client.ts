/**
 * Política de cache, retries e sincronização (documentada no README):
 *
 * - staleTime 30s para catálogo (eventos nft.updated mantêm preço/estoque
 *   atualizados entre refetches); dados privados usam staleTime 0 por padrão
 *   nas próprias queries quando necessário.
 * - gcTime 5min.
 * - Retries: queries tentam de novo até 2x apenas em erro transitório
 *   (rede, timeout, 5xx), com backoff exponencial. Erros 4xx não repetem.
 * - Mutations não repetem automaticamente. O pedido trata timeout manualmente,
 *   reenviando com a MESMA Idempotency-Key.
 * - refetchOnWindowFocus ligado para dados ativos; refetchOnReconnect ligado.
 */
import { QueryClient } from '@tanstack/react-query'
import { isApiError } from './http'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => isApiError(error) && error.isTransient && failureCount < 2,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: { retry: false },
    },
  })
}

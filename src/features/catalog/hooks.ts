/**
 * Estado remoto e utilitários do catálogo.
 *
 * - Catálogo/destaques/detalhe: queries públicas, chave derivada dos parâmetros da URL.
 * - Favoritos: dado privado, chave SEMPRE com o userId (`qk.favorites(userId)`), com
 *   atualização otimista e rollback no erro.
 */
import * as React from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FavoritesResponse } from '@/contracts'
import { isApiError } from '@/lib/http'
import { qk } from '@/lib/query-keys'
import { useSession } from '@/features/session/session'
import { catalogApi } from './api'
import { toListParams, type CatalogSearch } from './search'

export function useFeaturedNfts() {
  return useQuery({
    queryKey: qk.nfts.featured,
    queryFn: ({ signal }) => catalogApi.featured(signal),
  })
}

/** Contagens reais do catálogo inteiro, para a barra de filtros (nunca muda com os filtros ativos). */
export function useCatalogFacets() {
  return useQuery({
    queryKey: qk.nfts.facets,
    queryFn: ({ signal }) => catalogApi.facets(signal),
    staleTime: 5 * 60_000,
  })
}

export function useNftList(search: CatalogSearch) {
  const params = toListParams(search)
  return useQuery({
    queryKey: qk.nfts.list(params),
    queryFn: ({ signal }) => catalogApi.list(params, signal),
    // Mantém a página anterior visível na troca de página/filtro (sem piscar skeleton).
    placeholderData: keepPreviousData,
  })
}

export function useNftDetail(nftId: string) {
  return useQuery({
    queryKey: qk.nfts.detail(nftId),
    queryFn: ({ signal }) => catalogApi.detail(nftId, signal),
  })
}

/** 404 do detalhe: tela dedicada, não erro genérico. */
export function isNotFoundError(error: unknown) {
  return isApiError(error) && error.code === 'NOT_FOUND'
}

// ---------------------------------------------------------------------------
// Favoritos
// ---------------------------------------------------------------------------

/** Chave de favoritos do usuário atual. 'anonymous' nunca é consultado (query desabilitada). */
function useFavoritesKey() {
  const { user } = useSession()
  return { key: qk.favorites(user?.id ?? 'anonymous'), userId: user?.id ?? null }
}

export function useFavorites() {
  const { key, userId } = useFavoritesKey()
  const q = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => catalogApi.favorites(signal),
    enabled: !!userId,
  })
  return { ...q, nftIds: q.data?.nftIds ?? [] }
}

export interface ToggleFavoriteVars {
  nftId: string
  /** true = favoritar, false = desfavoritar. */
  next: boolean
}

export function useToggleFavorite() {
  const qc = useQueryClient()
  const { key } = useFavoritesKey()

  return useMutation({
    mutationFn: ({ nftId, next }: ToggleFavoriteVars) =>
      next ? catalogApi.addFavorite(nftId) : catalogApi.removeFavorite(nftId),

    onMutate: async ({ nftId, next }) => {
      // Cancela refetch em voo para ele não sobrescrever o estado otimista.
      await qc.cancelQueries({ queryKey: key })
      const snapshot = qc.getQueryData<FavoritesResponse>(key)
      qc.setQueryData<FavoritesResponse>(key, () => {
        const ids = snapshot?.nftIds ?? []
        return { nftIds: next ? (ids.includes(nftId) ? ids : [...ids, nftId]) : ids.filter((id) => id !== nftId) }
      })
      return { snapshot }
    },

    onError: (_error, _vars, ctx) => {
      // Rollback: devolve exatamente o que havia antes (ou remove o cache fabricado).
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot)
      else qc.removeQueries({ queryKey: key })
    },

    onSuccess: (data) => {
      qc.setQueryData(key, data)
    },

    onSettled: (_data, _error, vars) => {
      void qc.invalidateQueries({ queryKey: key })
      // favoritesCount vem do catálogo: deixa a API recalcular.
      void qc.invalidateQueries({ queryKey: qk.nfts.detail(vars.nftId) })
    },
  })
}

// ---------------------------------------------------------------------------
// Utilitários de UI
// ---------------------------------------------------------------------------

/**
 * Casa uma media query. Usado para renderizar os filtros em UM lugar só
 * (coluna lateral no desktop OU sheet no mobile), sem duplicar data-testid.
 */
export function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )
  const getSnapshot = React.useCallback(() => window.matchMedia(query).matches, [query])
  // No SSR/primeiro paint sem window assume mobile (layout mais estreito).
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}

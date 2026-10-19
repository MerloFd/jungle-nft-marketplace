/**
 * Estado remoto do carrinho. A API é a fonte da verdade do resumo de valores:
 * toda mutation devolve o carrinho completo, que substitui o cache.
 * Chave isolada por usuário (`['cart', userId | 'guest']`).
 */
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AddCartItemInput, Cart, Network } from '@/contracts'
import { qk } from '@/lib/query-keys'
import { useAuthScope, useSession } from '@/features/session/session'
import { cartApi } from './api'

export const cartQueryOptions = (scope: string) =>
  queryOptions({
    queryKey: qk.cart(scope),
    queryFn: ({ signal }) => cartApi.get(signal),
    staleTime: 10_000,
  })

export function useCart() {
  const scope = useAuthScope()
  const { isPending } = useSession()
  return useQuery({ ...cartQueryOptions(scope), enabled: !isPending })
}

/** Quantidade total de unidades (badge do cabeçalho). */
export function useCartCount() {
  const { data } = useCart()
  return data?.items.reduce((n, i) => n + i.quantity, 0) ?? 0
}

function useCartMutation<TVars>(fn: (vars: TVars) => Promise<Cart>) {
  const qc = useQueryClient()
  const scope = useAuthScope()
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart) => {
      qc.setQueryData(qk.cart(scope), cart)
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: qk.cart(scope) })
    },
  })
}

export const useAddToCart = () => useCartMutation((input: AddCartItemInput) => cartApi.addItem(input))
export const useUpdateCartItem = () => useCartMutation(({ itemId, quantity }: { itemId: string; quantity: number }) => cartApi.updateItem(itemId, quantity))
export const useRemoveCartItem = () => useCartMutation((itemId: string) => cartApi.removeItem(itemId))
export const useAcknowledgeCart = () => useCartMutation((_: void) => cartApi.acknowledge())
export const useApplyCoupon = () => useCartMutation((code: string) => cartApi.applyCoupon(code))
export const useRemoveCoupon = () => useCartMutation((_: void) => cartApi.removeCoupon())
export const useSetCartNetwork = () => useCartMutation((network: Network) => cartApi.setNetwork(network))

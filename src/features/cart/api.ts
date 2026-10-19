import { Cart, type AddCartItemInput, type Network } from '@/contracts'
import { request } from '@/lib/http'

export const cartApi = {
  get: (signal?: AbortSignal) => request(Cart, { method: 'GET', url: '/cart', signal }),
  setNetwork: (network: Network) => request(Cart, { method: 'PATCH', url: '/cart', data: { network } }),
  addItem: (input: AddCartItemInput) => request(Cart, { method: 'POST', url: '/cart/items', data: input }),
  updateItem: (itemId: string, quantity: number) => request(Cart, { method: 'PATCH', url: `/cart/items/${itemId}`, data: { quantity } }),
  removeItem: (itemId: string) => request(Cart, { method: 'DELETE', url: `/cart/items/${itemId}` }),
  acknowledge: () => request(Cart, { method: 'POST', url: '/cart/acknowledge' }),
  applyCoupon: (code: string) => request(Cart, { method: 'POST', url: '/cart/coupon', data: { code } }),
  removeCoupon: () => request(Cart, { method: 'DELETE', url: '/cart/coupon' }),
}

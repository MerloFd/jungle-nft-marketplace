/**
 * Endpoints do checkout: conexão de carteira, cotação e pedido.
 * Toda chamada passa por `request()` e é validada com os schemas de @/contracts.
 */
import { z } from 'zod'
import {
  Order,
  Quote,
  QuoteValidation,
  WalletConnection,
  type CreateOrderInput,
  type Network,
} from '@/contracts'
import { request } from '@/lib/http'

/** GET /wallets/connection devolve `null` quando nenhuma carteira está conectada. */
const WalletConnectionOrNull = WalletConnection.nullable()

const OrdersResponse = z.object({ items: z.array(Order) })

export const checkoutApi = {
  // Carteira ----------------------------------------------------------------
  getConnection: (signal?: AbortSignal) => request(WalletConnectionOrNull, { method: 'GET', url: '/wallets/connection', signal }),
  connectWallet: (walletId: string, network: Network) =>
    request(WalletConnection, { method: 'POST', url: `/wallets/${walletId}/connect`, data: { network } }),
  disconnectWallet: (walletId: string) => request(WalletConnection, { method: 'POST', url: `/wallets/${walletId}/disconnect` }),

  // Cotação -----------------------------------------------------------------
  createQuote: (network: Network) => request(Quote, { method: 'POST', url: '/quotes', data: { network } }),
  getQuote: (quoteId: string, signal?: AbortSignal) => request(Quote, { method: 'GET', url: `/quotes/${quoteId}`, signal }),
  validateQuote: (quoteId: string) => request(QuoteValidation, { method: 'POST', url: `/quotes/${quoteId}/validate` }),

  // Pedido ------------------------------------------------------------------
  /** A chave de idempotência vai no cabeçalho: o mesmo par (chave, conteúdo) devolve o mesmo pedido. */
  createOrder: (input: CreateOrderInput, idempotencyKey: string) =>
    request(Order, { method: 'POST', url: '/orders', data: input, headers: { 'Idempotency-Key': idempotencyKey } }),
  getOrder: (orderId: string, signal?: AbortSignal) => request(Order, { method: 'GET', url: `/orders/${orderId}`, signal }),
  /** Recuperação após timeout: descobre se o pedido daquela chave já existe. */
  findByIdempotencyKey: (idempotencyKey: string, signal?: AbortSignal) =>
    request(OrdersResponse, { method: 'GET', url: '/orders', params: { idempotencyKey }, signal }).then((r) => r.items[0] ?? null),
}

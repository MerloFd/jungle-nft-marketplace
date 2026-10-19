/**
 * Fábrica de query keys. Dados privados SEMPRE incluem o userId na chave
 * (isolamento por usuário); consultas do catálogo incluem os parâmetros.
 */
import type { NftListParams } from '@/contracts'

export const qk = {
  session: ['session'] as const,
  nfts: {
    all: ['nfts'] as const,
    lists: ['nfts', 'list'] as const,
    list: (params: NftListParams) => ['nfts', 'list', params] as const,
    featured: ['nfts', 'featured'] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
  },
  /** scope = userId ou "guest" */
  cart: (scope: string) => ['cart', scope] as const,
  user: (userId: string) => ['user', userId] as const,
  favorites: (userId: string) => ['user', userId, 'favorites'] as const,
  profile: (userId: string) => ['user', userId, 'profile'] as const,
  wallets: (userId: string) => ['user', userId, 'wallets'] as const,
  walletConnection: (userId: string) => ['user', userId, 'wallet-connection'] as const,
  quote: (userId: string, quoteId: string) => ['user', userId, 'quote', quoteId] as const,
  order: (userId: string, orderId: string) => ['user', userId, 'order', orderId] as const,
}

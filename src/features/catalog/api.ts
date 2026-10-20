import { FavoritesResponse, FeaturedResponse, NftDetail, NftFacets, NftListResponse, type NftListParams } from '@/contracts'
import { request } from '@/lib/http'

export const catalogApi = {
  /** O `signal` vem do TanStack Query: troca de filtro cancela a requisição anterior. */
  list: (params: NftListParams, signal?: AbortSignal) => request(NftListResponse, { method: 'GET', url: '/nfts', params, signal }),
  featured: (signal?: AbortSignal) => request(FeaturedResponse, { method: 'GET', url: '/nfts/featured', signal }),
  /** Contagens reais do catálogo inteiro, para a barra de filtros. */
  facets: (signal?: AbortSignal) => request(NftFacets, { method: 'GET', url: '/nfts/facets', signal }),
  detail: (id: string, signal?: AbortSignal) => request(NftDetail, { method: 'GET', url: `/nfts/${encodeURIComponent(id)}`, signal }),
  favorites: (signal?: AbortSignal) => request(FavoritesResponse, { method: 'GET', url: '/favorites', signal }),
  addFavorite: (nftId: string) => request(FavoritesResponse, { method: 'PUT', url: `/favorites/${encodeURIComponent(nftId)}` }),
  removeFavorite: (nftId: string) => request(FavoritesResponse, { method: 'DELETE', url: `/favorites/${encodeURIComponent(nftId)}` }),
}

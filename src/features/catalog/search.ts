/**
 * Estado do catálogo na URL. Busca, filtros, ordenação e paginação vivem nos
 * search params (sobrevivem a refresh e ao histórico). Valores inválidos na URL
 * caem para o padrão em vez de quebrar a página.
 */
import { z } from 'zod'
import { Availability, Category, EthAmount, NftSort, type NftListParams } from '@/contracts'

export const CATALOG_PAGE_SIZE = 12

export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: z.array(Category).optional().catch(undefined),
  minPrice: EthAmount.optional().catch(undefined),
  maxPrice: EthAmount.optional().catch(undefined),
  availability: Availability.optional().catch(undefined),
  sort: NftSort.optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

/** Converte a URL em parâmetros da API (sem chaves vazias, para a query key ser estável). */
export function toListParams(s: CatalogSearch): NftListParams {
  const p: NftListParams = { pageSize: CATALOG_PAGE_SIZE, page: s.page ?? 1 }
  if (s.q) p.q = s.q
  if (s.category?.length) p.category = [...s.category].sort()
  if (s.minPrice) p.minPrice = s.minPrice
  if (s.maxPrice) p.maxPrice = s.maxPrice
  if (s.availability && s.availability !== 'all') p.availability = s.availability
  if (s.sort && s.sort !== 'recent') p.sort = s.sort
  return p
}

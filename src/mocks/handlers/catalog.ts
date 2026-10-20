import { http } from 'msw'
import { Availability, Category, NftSort, type NftDetail } from '@/contracts'
import { eth } from '@/lib/money'
import { db, findNft, persist, toSummary } from '../db'
import { API, apiError, json, network, notFound, requireUser } from '../http'
import { consumeOnce, getScenario } from '../scenarios'

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

function catalogFailure(): Response | null {
  const sc = getScenario()
  if (sc.catalogError) return apiError(500, 'INTERNAL', 'Erro interno ao consultar o catálogo')
  if (sc.catalogFlaky && consumeOnce('catalog-flaky')) return apiError(503, 'TRANSIENT', 'Serviço temporariamente indisponível')
  return null
}

function parseList(url: URL) {
  const sp = url.searchParams
  const q = sp.get('q')?.trim() || undefined
  const categories = sp.getAll('category').filter((c): c is Category => Category.safeParse(c).success)
  const minPrice = sp.get('minPrice') && /^\d+(\.\d+)?$/.test(sp.get('minPrice')!) ? sp.get('minPrice')! : undefined
  const maxPrice = sp.get('maxPrice') && /^\d+(\.\d+)?$/.test(sp.get('maxPrice')!) ? sp.get('maxPrice')! : undefined
  const availability = Availability.safeParse(sp.get('availability')).data ?? 'all'
  const sort = NftSort.safeParse(sp.get('sort')).data ?? 'recent'
  const page = Math.max(1, Number.parseInt(sp.get('page') ?? '1', 10) || 1)
  const pageSize = Math.min(48, Math.max(1, Number.parseInt(sp.get('pageSize') ?? '12', 10) || 12))
  return { q, categories, minPrice, maxPrice, availability, sort, page, pageSize }
}

function sortNfts(list: NftDetail[], sort: NftSort) {
  const byId = (a: NftDetail, b: NftDetail) => a.id.localeCompare(b.id)
  const cmp: Record<NftSort, (a: NftDetail, b: NftDetail) => number> = {
    recent: (a, b) => b.createdAt.localeCompare(a.createdAt) || byId(a, b),
    'price-asc': (a, b) => eth.cmp(a.floorPriceEth, b.floorPriceEth) || byId(a, b),
    'price-desc': (a, b) => eth.cmp(b.floorPriceEth, a.floorPriceEth) || byId(a, b),
    popular: (a, b) => b.favoritesCount - a.favoritesCount || byId(a, b),
    name: (a, b) => a.name.localeCompare(b.name, 'pt-BR') || byId(a, b),
  }
  return [...list].sort(cmp[sort])
}

export const catalogHandlers = [
  http.get(`${API}/nfts/featured`, async () => {
    const fail = (await network()) ?? catalogFailure()
    if (fail) return fail
    if (getScenario().emptyCatalog) return json({ items: [] })
    return json({ items: db().nfts.filter((n) => n.featured).slice(0, 8).map(toSummary) })
  }),

  http.get(`${API}/nfts`, async ({ request }) => {
    const fail = (await network()) ?? catalogFailure()
    if (fail) return fail
    const p = parseList(new URL(request.url))
    let list = getScenario().emptyCatalog ? [] : db().nfts
    if (p.q) {
      const terms = normalize(p.q).split(/\s+/).filter(Boolean)
      list = list.filter((n) => {
        const hay = normalize(`${n.name} ${n.collectionName} ${n.creator.name} ${n.tags.join(' ')}`)
        return terms.every((t) => hay.includes(t))
      })
    }
    if (p.categories.length) list = list.filter((n) => p.categories.includes(n.category))
    if (p.minPrice) list = list.filter((n) => eth.cmp(n.floorPriceEth, p.minPrice!) >= 0)
    if (p.maxPrice) list = list.filter((n) => eth.cmp(n.floorPriceEth, p.maxPrice!) <= 0)
    if (p.availability === 'available') list = list.filter((n) => n.available > 0)
    if (p.availability === 'sold-out') list = list.filter((n) => n.available === 0)
    list = sortNfts(list, p.sort)
    const total = list.length
    const totalPages = Math.max(1, Math.ceil(total / p.pageSize))
    const start = (p.page - 1) * p.pageSize
    return json({
      items: list.slice(start, start + p.pageSize).map(toSummary),
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages,
    })
  }),

  /** Contagens reais do catálogo (barra de filtros): nunca filtra, sempre agrega tudo. */
  http.get(`${API}/nfts/facets`, async () => {
    const fail = (await network()) ?? catalogFailure()
    if (fail) return fail
    const all = db().nfts
    const category = Object.fromEntries(Category.options.map((c) => [c, 0])) as Record<Category, number>
    for (const n of all) category[n.category] += 1
    const prices = all.map((n) => n.floorPriceEth)
    const min = prices.reduce((a, b) => (eth.cmp(a, b) <= 0 ? a : b), prices[0] ?? '0')
    const max = prices.reduce((a, b) => (eth.cmp(a, b) >= 0 ? a : b), prices[0] ?? '0')
    return json({ category, priceRange: { min, max } })
  }),

  http.get(`${API}/nfts/:id`, async ({ params }) => {
    const fail = (await network()) ?? catalogFailure()
    if (fail) return fail
    const nft = findNft(String(params.id))
    if (!nft || getScenario().emptyCatalog) return notFound('NFT')
    return json(nft)
  }),

  // Favoritos ---------------------------------------------------------------

  http.get(`${API}/favorites`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    return json({ nftIds: db().favorites[userId] ?? [] })
  }),

  http.put(`${API}/favorites/:nftId`, async ({ request, params }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    if (getScenario().favoritesError) return apiError(500, 'INTERNAL', 'Não foi possível salvar o favorito')
    const nft = findNft(String(params.nftId))
    if (!nft) return notFound('NFT')
    const s = db()
    const list = (s.favorites[userId] ??= [])
    if (!list.includes(nft.id)) {
      list.push(nft.id)
      nft.favoritesCount += 1
      persist()
    }
    return json({ nftIds: list })
  }),

  http.delete(`${API}/favorites/:nftId`, async ({ request, params }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    if (getScenario().favoritesError) return apiError(500, 'INTERNAL', 'Não foi possível remover o favorito')
    const s = db()
    const id = String(params.nftId)
    const list = s.favorites[userId] ?? []
    if (list.includes(id)) {
      s.favorites[userId] = list.filter((x) => x !== id)
      const nft = findNft(id)
      if (nft) nft.favoritesCount = Math.max(0, nft.favoritesCount - 1)
      persist()
    }
    return json({ nftIds: s.favorites[userId] ?? [] })
  }),
]

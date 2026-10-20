/**
 * "Banco" da API simulada. Fonte única de verdade para catálogo, favoritos,
 * carrinho, cotações, pedidos, perfil e carteiras: os handlers REST e os
 * eventos Socket.IO leem e escrevem aqui, então qualquer mudança aparece nos
 * dois canais.
 *
 * Persistido em localStorage (`mock:db:v1`) para sobreviver a refresh.
 * `resetDb()` restaura integralmente o cenário conhecido (seed).
 */
import type {
  AppliedCoupon,
  Cart,
  CartItem,
  Network,
  NftDetail,
  NftSummary,
  Order,
  Quote,
  QuoteLine,
  User,
  Wallet,
} from '@/contracts'
import { eth } from '@/lib/money'
import { SEED_NFTS } from './fixtures'
import { resetRandom } from './scenarios'

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

export interface DbUser extends User {
  passwordHash: string
  passwordSalt: string
}

export interface DbSession {
  token: string
  userId: string
  expiresAt: string
}

export interface DbCartLine {
  id: string
  nftId: string
  editionId: string
  quantity: number
  /** Preço no momento da inclusão/última confirmação do usuário. Base para avisos. */
  seenUnitPriceEth: string
  /** Marcado quando a API reduziu a quantidade por falta de estoque. */
  quantityReduced: boolean
}

export interface DbCart {
  id: string
  ownerKey: string
  lines: DbCartLine[]
  couponCode: string | null
  network: Network
  version: number
  updatedAt: string
}

export interface DbQuote extends Quote {
  ownerKey: string
}

export interface DbOrder extends Order {
  userId: string
  requestHash: string
}

export interface DbWallet extends Wallet {
  userId: string
}

export interface DbState {
  schema: 1
  nfts: NftDetail[]
  users: DbUser[]
  sessions: DbSession[]
  carts: Record<string, DbCart>
  favorites: Record<string, string[]>
  quotes: Record<string, DbQuote>
  orders: Record<string, DbOrder>
  /** `${userId}:${idempotencyKey}` -> orderId */
  idempotency: Record<string, string>
  wallets: DbWallet[]
  counters: { order: number; event: number; id: number }
}

// ---------------------------------------------------------------------------
// Constantes de negócio
// ---------------------------------------------------------------------------

export const SESSION_TTL_MS = 30 * 60 * 1000
export const SHORT_SESSION_TTL_MS = 20 * 1000
export const QUOTE_TTL_MS = 10 * 60 * 1000

export const COUPONS: Record<string, { description: string; percentOff: number; expiresAt: string }> = {
  JUNGLE10: { description: '10% de desconto', percentOff: 10, expiresAt: '2099-12-31T23:59:59.000Z' },
  WELCOME5: { description: '5% de boas-vindas', percentOff: 5, expiresAt: '2099-12-31T23:59:59.000Z' },
  EXPIRED20: { description: '20% de desconto (encerrado)', percentOff: 20, expiresAt: '2025-01-01T00:00:00.000Z' },
}

/** Taxa de rede = base + por item (linha). Strings decimais. */
export const NETWORK_FEES: Record<Network, { base: string; perLine: string }> = {
  ethereum: { base: '0.0018', perLine: '0.0003' },
  polygon: { base: '0.00004', perLine: '0.00001' },
  arbitrum: { base: '0.0002', perLine: '0.00005' },
}

export const SEED_PASSWORD = 'jungle123'

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'mock:db:v3'

export function nowIso() {
  return new Date(Date.now()).toISOString()
}

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

/** FNV-1a 32 bits, suficiente para fingerprint/hash de requisição na simulação. */
export function hashString(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** JSON estável (chaves ordenadas) para hashing. */
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(v)
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function randomToken(prefix: string) {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return `${prefix}_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

let state: DbState | null = null

async function buildSeed(): Promise<DbState> {
  const createdAt = '2026-01-10T12:00:00.000Z'
  const users: DbUser[] = []
  const seedUsers = [
    { id: 'usr_ana', name: 'Ana Colecionadora', username: 'ana', email: 'ana@jungle.dev', bio: 'Coleciono arte generativa desde 2021.', avatarUrl: '/avatars/creator-03.svg' },
    { id: 'usr_bruno', name: 'Bruno Pixel', username: 'bruno', email: 'bruno@jungle.dev', bio: 'Fotografia e música on-chain.', avatarUrl: '/avatars/creator-07.svg' },
  ]
  for (const u of seedUsers) {
    const passwordSalt = `salt-${u.id}`
    users.push({ ...u, createdAt, passwordSalt, passwordHash: await hashPassword(SEED_PASSWORD, passwordSalt) })
  }

  const wallets: DbWallet[] = [
    { id: 'wal_ana_1', userId: 'usr_ana', role: 'primary', label: 'Carteira principal', provider: 'metamask', address: '0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c', networks: ['ethereum', 'polygon', 'arbitrum'], updatedAt: createdAt },
    { id: 'wal_ana_2', userId: 'usr_ana', role: 'secondary', label: 'Reserva', provider: 'coinbase', address: '0x9b3f7c1a2d4e5f60718293a4b5c6d7e8f9012345', networks: ['polygon'], updatedAt: createdAt },
    { id: 'wal_bruno_1', userId: 'usr_bruno', role: 'primary', label: 'Minha MetaMask', provider: 'metamask', address: '0x1111a2b3c4d5e6f708192a3b4c5d6e7f80910111', networks: ['ethereum', 'arbitrum'], updatedAt: createdAt },
  ]

  return {
    schema: 1,
    nfts: clone(SEED_NFTS),
    users,
    sessions: [],
    carts: {},
    favorites: { usr_ana: ['nft-02', 'nft-05'], usr_bruno: [] },
    quotes: {},
    orders: {},
    idempotency: {},
    wallets,
    counters: { order: 1000, event: 0, id: 0 },
  }
}

export async function initDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.schema === 1) {
        state = parsed
        return
      }
    }
  } catch {
    /* storage indisponível ou corrompido: recomeça do seed */
  }
  state = await buildSeed()
  persist()
}

export async function resetDb() {
  state = await buildSeed()
  resetRandom()
  persist()
}

export function db(): DbState {
  if (!state) throw new Error('Mock DB não inicializado')
  return state
}

export function persist() {
  if (!state) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota cheia ou storage bloqueado: segue em memória */
  }
}

export function nextId(prefix: string) {
  const s = db()
  s.counters.id += 1
  return `${prefix}_${s.counters.id.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
}

export function nextEventId() {
  const s = db()
  s.counters.event += 1
  return `evt_${s.counters.event}`
}

// ---------------------------------------------------------------------------
// Usuários e sessão
// ---------------------------------------------------------------------------

export function publicUser(u: DbUser): User {
  const { passwordHash: _h, passwordSalt: _s, ...rest } = u
  return rest
}

export function findUserByEmail(email: string) {
  return db().users.find((u) => u.email.toLowerCase() === email.toLowerCase())
}

export function findUser(id: string) {
  return db().users.find((u) => u.id === id)
}

// ---------------------------------------------------------------------------
// NFTs
// ---------------------------------------------------------------------------

export function findNft(id: string) {
  return db().nfts.find((n) => n.id === id)
}

export function recomputeNftAggregates(n: NftDetail) {
  const avail = n.editions.filter((e) => e.available > 0)
  const pool = avail.length ? avail : n.editions
  n.floorPriceEth = pool.reduce((min, e) => (eth.cmp(e.priceEth, min) < 0 ? e.priceEth : min), pool[0].priceEth)
  n.available = n.editions.reduce((sum, e) => sum + e.available, 0)
}

export function toSummary(n: NftDetail): NftSummary {
  return {
    id: n.id,
    name: n.name,
    image: n.image,
    imageAlt: n.imageAlt,
    category: n.category,
    creator: n.creator,
    collectionName: n.collectionName,
    floorPriceEth: n.floorPriceEth,
    available: n.available,
    favoritesCount: n.favoritesCount,
    featured: n.featured,
    createdAt: n.createdAt,
    version: n.version,
  }
}

// ---------------------------------------------------------------------------
// Carrinho
// ---------------------------------------------------------------------------

export function cartFor(ownerKey: string): DbCart {
  const s = db()
  let cart = s.carts[ownerKey]
  if (!cart) {
    cart = { id: nextId('cart'), ownerKey, lines: [], couponCode: null, network: 'ethereum', version: 1, updatedAt: nowIso() }
    s.carts[ownerKey] = cart
  }
  return cart
}

export function touchCart(cart: DbCart) {
  cart.version += 1
  cart.updatedAt = nowIso()
}

export function couponState(code: string | null): { coupon: AppliedCoupon | null; error: 'COUPON_INVALID' | 'COUPON_EXPIRED' | null } {
  if (!code) return { coupon: null, error: null }
  const c = COUPONS[code.toUpperCase()]
  if (!c) return { coupon: null, error: 'COUPON_INVALID' }
  if (new Date(c.expiresAt).getTime() < Date.now()) return { coupon: null, error: 'COUPON_EXPIRED' }
  return { coupon: { code: code.toUpperCase(), description: c.description, percentOff: c.percentOff }, error: null }
}

export function networkFee(network: Network, lineCount: number) {
  if (lineCount === 0) return '0'
  const f = NETWORK_FEES[network]
  return eth.add(f.base, eth.mul(f.perLine, lineCount))
}

export function summarize(lines: { lineTotalEth: string }[], coupon: AppliedCoupon | null, network: Network) {
  const subtotalEth = eth.add('0', ...lines.map((l) => l.lineTotalEth))
  const discountEth = coupon ? eth.percent(subtotalEth, coupon.percentOff) : '0'
  const networkFeeEth = networkFee(network, lines.length)
  const totalEth = eth.add(eth.sub(subtotalEth, discountEth), networkFeeEth)
  return { subtotalEth, discountEth, networkFeeEth, totalEth }
}

/**
 * Reconciliação do carrinho com o catálogo: remove linhas de NFTs inexistentes
 * e reduz quantidades acima do estoque. Retorna true se algo mudou.
 */
export function reconcileCart(cart: DbCart): boolean {
  let changed = false
  cart.lines = cart.lines.filter((l) => {
    const nft = findNft(l.nftId)
    const ed = nft?.editions.find((e) => e.id === l.editionId)
    if (!ed) changed = true
    return !!ed
  })
  for (const l of cart.lines) {
    const ed = findNft(l.nftId)!.editions.find((e) => e.id === l.editionId)!
    const cap = Math.min(ed.available, ed.maxPerOrder)
    if (ed.available > 0 && l.quantity > cap) {
      l.quantity = cap
      l.quantityReduced = true
      changed = true
    }
  }
  if (changed) touchCart(cart)
  return changed
}

export function cartView(cart: DbCart): Cart {
  const items: CartItem[] = cart.lines.map((l) => {
    const nft = findNft(l.nftId)!
    const ed = nft.editions.find((e) => e.id === l.editionId)!
    let notice: CartItem['notice'] = null
    if (ed.available === 0) notice = 'sold-out'
    else if (l.quantityReduced) notice = 'quantity-reduced'
    else if (eth.cmp(ed.priceEth, l.seenUnitPriceEth) > 0) notice = 'price-increased'
    else if (eth.cmp(ed.priceEth, l.seenUnitPriceEth) < 0) notice = 'price-decreased'
    return {
      id: l.id,
      nftId: l.nftId,
      editionId: l.editionId,
      quantity: l.quantity,
      nftName: nft.name,
      image: nft.image,
      imageAlt: nft.imageAlt,
      editionName: ed.name,
      unitPriceEth: ed.priceEth,
      available: ed.available,
      maxPerOrder: ed.maxPerOrder,
      lineTotalEth: ed.available === 0 ? '0' : eth.mul(ed.priceEth, l.quantity),
      notice,
    }
  })
  const { coupon } = couponState(cart.couponCode)
  const billable = items.filter((i) => i.notice !== 'sold-out')
  return {
    id: cart.id,
    ownerType: cart.ownerKey.startsWith('user:') ? 'user' : 'guest',
    items,
    coupon,
    network: cart.network,
    summary: summarize(billable, coupon, cart.network),
    version: cart.version,
    updatedAt: cart.updatedAt,
  }
}

// ---------------------------------------------------------------------------
// Cotação
// ---------------------------------------------------------------------------

export function buildQuoteFromCart(cart: DbCart, network: Network): Omit<DbQuote, 'id' | 'createdAt' | 'expiresAt'> {
  const view = cartView(cart)
  const lines: QuoteLine[] = view.items
    .filter((i) => i.notice !== 'sold-out')
    .map((i) => ({
      cartItemId: i.id,
      nftId: i.nftId,
      editionId: i.editionId,
      nftName: i.nftName,
      editionName: i.editionName,
      image: i.image,
      imageAlt: i.imageAlt,
      quantity: i.quantity,
      unitPriceEth: i.unitPriceEth,
      lineTotalEth: i.lineTotalEth,
    }))
  const summary = summarize(lines, view.coupon, network)
  const fingerprint = hashString(
    stableStringify({
      lines: lines.map((l) => [l.nftId, l.editionId, l.quantity, l.unitPriceEth]),
      coupon: view.coupon?.code ?? null,
      network,
      summary,
    }),
  )
  return { ownerKey: cart.ownerKey, lines, coupon: view.coupon, network, summary, fingerprint }
}

export function storeQuote(q: Omit<DbQuote, 'id' | 'createdAt' | 'expiresAt'>): DbQuote {
  const quote: DbQuote = {
    ...q,
    id: nextId('qt'),
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  }
  db().quotes[quote.id] = quote
  return quote
}

export function publicQuote(q: DbQuote): Quote {
  const { ownerKey: _o, ...rest } = q
  return rest
}

export function publicOrder(o: DbOrder): Order {
  const { userId: _u, requestHash: _r, ...rest } = o
  return rest
}

export function publicWallet(w: DbWallet): Wallet {
  const { userId: _u, ...rest } = w
  return rest
}

/** Exposto para o painel de debug e testes. */
export function snapshot(): DbState {
  return clone(db())
}

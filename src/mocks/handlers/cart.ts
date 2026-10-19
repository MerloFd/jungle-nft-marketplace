import { http } from 'msw'
import { AddCartItemInput, ApplyCouponInput, CreateQuoteInput, Network, UpdateCartItemInput, type QuoteValidation } from '@/contracts'
import { eth } from '@/lib/money'
import {
  buildQuoteFromCart,
  cartFor,
  cartView,
  couponState,
  db,
  findNft,
  nextId,
  persist,
  publicQuote,
  reconcileCart,
  storeQuote,
  touchCart,
  type DbQuote,
} from '../db'
import { API, apiError, cartOwner, json, network, notFound, readJson, requireUser, validationError } from '../http'
import { updateEdition } from '../mutations'
import { consumeOnce, getScenario } from '../scenarios'

function currentCart(ownerKey: string) {
  const cart = cartFor(ownerKey)
  if (reconcileCart(cart)) persist()
  return cart
}

/** Calcula diferenças entre duas cotações para explicar ao usuário. */
function diffQuotes(prev: DbQuote, next: Omit<DbQuote, 'id' | 'createdAt' | 'expiresAt'>): QuoteValidation['changes'] {
  const changes: QuoteValidation['changes'] = []
  for (const old of prev.lines) {
    const cur = next.lines.find((l) => l.cartItemId === old.cartItemId)
    if (!cur) {
      changes.push({ kind: 'removed', nftId: old.nftId, message: `${old.nftName} (${old.editionName}) não está mais disponível` })
      continue
    }
    if (!eth.eq(cur.unitPriceEth, old.unitPriceEth)) {
      changes.push({ kind: 'price', nftId: old.nftId, message: `O preço de ${old.nftName} (${old.editionName}) mudou de ${old.unitPriceEth} para ${cur.unitPriceEth} ETH` })
    }
    if (cur.quantity !== old.quantity) {
      changes.push({ kind: 'availability', nftId: old.nftId, message: `A quantidade de ${old.nftName} foi ajustada para ${cur.quantity} por disponibilidade` })
    }
  }
  if ((prev.coupon?.code ?? null) !== (next.coupon?.code ?? null)) changes.push({ kind: 'coupon', message: 'O cupom aplicado mudou ou deixou de ser válido' })
  if (!eth.eq(prev.summary.networkFeeEth, next.summary.networkFeeEth)) changes.push({ kind: 'fee', message: 'A taxa de rede foi atualizada' })
  return changes
}

/** Agenda mudanças de catálogo do cenário de checkout (uma vez por cenário). */
function scheduleCheckoutScenario(q: DbQuote) {
  const sc = getScenario()
  const first = q.lines[0]
  if (!first) return
  if (sc.priceChangeDuringCheckout && consumeOnce('price-change')) {
    setTimeout(() => {
      const ed = findNft(first.nftId)?.editions.find((e) => e.id === first.editionId)
      if (ed) updateEdition(first.nftId, first.editionId, { priceEth: eth.add(ed.priceEth, eth.percent(ed.priceEth, 15)) })
    }, 1500)
  }
  if (sc.soldOutDuringCheckout && consumeOnce('sold-out')) {
    setTimeout(() => updateEdition(first.nftId, first.editionId, { available: 0 }), 1500)
  }
}

export const cartHandlers = [
  http.get(`${API}/cart`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const owner = cartOwner(request)
    if (owner instanceof Response) return owner
    return json(cartView(currentCart(owner)))
  }),

  http.patch(`${API}/cart`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const owner = cartOwner(request)
    if (owner instanceof Response) return owner
    const body = await readJson<{ network?: unknown }>(request)
    const net = Network.safeParse(body?.network)
    if (!net.success) return validationError(net.error.issues)
    const cart = currentCart(owner)
    cart.network = net.data
    touchCart(cart)
    persist()
    return json(cartView(cart))
  }),

  http.post(`${API}/cart/items`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const owner = cartOwner(request)
    if (owner instanceof Response) return owner
    const parsed = AddCartItemInput.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error.issues)
    const { nftId, editionId, quantity } = parsed.data
    const nft = findNft(nftId)
    if (!nft) return notFound('NFT')
    const ed = nft.editions.find((e) => e.id === editionId)
    if (!ed) return apiError(422, 'EDITION_UNAVAILABLE', 'Edição inexistente para este NFT')
    if (ed.available === 0) return apiError(409, 'OUT_OF_STOCK', `A edição ${ed.name} está esgotada`, { details: { available: 0 } })
    const cart = currentCart(owner)
    const line = cart.lines.find((l) => l.nftId === nftId && l.editionId === editionId)
    const nextQty = (line?.quantity ?? 0) + quantity
    const cap = Math.min(ed.available, ed.maxPerOrder)
    if (nextQty > cap) {
      return apiError(409, nextQty > ed.maxPerOrder ? 'QUANTITY_LIMIT' : 'OUT_OF_STOCK', `Limite de ${cap} unidade(s) para esta edição`, {
        details: { max: cap, inCart: line?.quantity ?? 0 },
      })
    }
    if (line) {
      line.quantity = nextQty
      line.seenUnitPriceEth = ed.priceEth
      line.quantityReduced = false
    } else {
      cart.lines.push({ id: nextId('ci'), nftId, editionId, quantity, seenUnitPriceEth: ed.priceEth, quantityReduced: false })
    }
    touchCart(cart)
    persist()
    return json(cartView(cart), 201)
  }),

  http.patch(`${API}/cart/items/:itemId`, async ({ request, params }) => {
    const fail = await network()
    if (fail) return fail
    const owner = cartOwner(request)
    if (owner instanceof Response) return owner
    const parsed = UpdateCartItemInput.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error.issues)
    const cart = currentCart(owner)
    const line = cart.lines.find((l) => l.id === params.itemId)
    if (!line) return notFound('Item do carrinho')
    const ed = findNft(line.nftId)!.editions.find((e) => e.id === line.editionId)!
    const cap = Math.min(ed.available, ed.maxPerOrder)
    if (parsed.data.quantity > cap) {
      return apiError(409, parsed.data.quantity > ed.maxPerOrder ? 'QUANTITY_LIMIT' : 'OUT_OF_STOCK', `Limite de ${cap} unidade(s) para esta edição`, { details: { max: cap } })
    }
    line.quantity = parsed.data.quantity
    line.seenUnitPriceEth = ed.priceEth
    line.quantityReduced = false
    touchCart(cart)
    persist()
    return json(cartView(cart))
  }),

  http.delete(`${API}/cart/items/:itemId`, async ({ request, params }) => {
    const fail = await network()
    if (fail) return fail
    const owner = cartOwner(request)
    if (owner instanceof Response) return owner
    const cart = currentCart(owner)
    const before = cart.lines.length
    cart.lines = cart.lines.filter((l) => l.id !== params.itemId)
    if (cart.lines.length === before) return notFound('Item do carrinho')
    touchCart(cart)
    persist()
    return json(cartView(cart))
  }),

  /** Usuário reconhece os avisos de preço/estoque (aceita os valores atuais). */
  http.post(`${API}/cart/acknowledge`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const owner = cartOwner(request)
    if (owner instanceof Response) return owner
    const cart = currentCart(owner)
    for (const l of cart.lines) {
      const ed = findNft(l.nftId)!.editions.find((e) => e.id === l.editionId)!
      l.seenUnitPriceEth = ed.priceEth
      l.quantityReduced = false
    }
    touchCart(cart)
    persist()
    return json(cartView(cart))
  }),

  http.post(`${API}/cart/coupon`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const owner = cartOwner(request)
    if (owner instanceof Response) return owner
    const parsed = ApplyCouponInput.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error.issues)
    const { error } = couponState(parsed.data.code)
    if (error === 'COUPON_INVALID') return apiError(422, 'COUPON_INVALID', 'Cupom inválido', { fields: { code: 'Cupom inválido' } })
    if (error === 'COUPON_EXPIRED') return apiError(422, 'COUPON_EXPIRED', 'Este cupom expirou', { fields: { code: 'Este cupom expirou' } })
    const cart = currentCart(owner)
    cart.couponCode = parsed.data.code.toUpperCase()
    touchCart(cart)
    persist()
    return json(cartView(cart))
  }),

  http.delete(`${API}/cart/coupon`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const owner = cartOwner(request)
    if (owner instanceof Response) return owner
    const cart = currentCart(owner)
    cart.couponCode = null
    touchCart(cart)
    persist()
    return json(cartView(cart))
  }),

  /** Ao autenticar: move os itens do visitante para o carrinho do usuário. */
  http.post(`${API}/cart/merge`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const body = await readJson<{ guestId?: string }>(request)
    if (!body?.guestId) return apiError(422, 'VALIDATION_ERROR', 'guestId obrigatório', { fields: { guestId: 'Obrigatório' } })
    const s = db()
    const guestKey = `guest:${body.guestId}`
    const guest = s.carts[guestKey]
    const cart = currentCart(`user:${userId}`)
    if (guest && guest.lines.length) {
      for (const gl of guest.lines) {
        const ed = findNft(gl.nftId)?.editions.find((e) => e.id === gl.editionId)
        if (!ed || ed.available === 0) continue
        const cap = Math.min(ed.available, ed.maxPerOrder)
        const existing = cart.lines.find((l) => l.nftId === gl.nftId && l.editionId === gl.editionId)
        if (existing) {
          const merged = Math.min(cap, existing.quantity + gl.quantity)
          existing.quantityReduced = existing.quantityReduced || merged < existing.quantity + gl.quantity
          existing.quantity = merged
        } else {
          const qty = Math.min(cap, gl.quantity)
          cart.lines.push({ ...gl, id: nextId('ci'), quantity: qty, quantityReduced: qty < gl.quantity })
        }
      }
      if (!cart.couponCode && guest.couponCode) cart.couponCode = guest.couponCode
      delete s.carts[guestKey]
      touchCart(cart)
    }
    persist()
    return json(cartView(cart))
  }),

  // Cotação -----------------------------------------------------------------

  http.post(`${API}/quotes`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const parsed = CreateQuoteInput.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error.issues)
    const cart = currentCart(`user:${userId}`)
    const draft = buildQuoteFromCart(cart, parsed.data.network)
    if (!draft.lines.length) return apiError(422, 'VALIDATION_ERROR', 'Seu carrinho não tem itens disponíveis para compra')
    const { error } = couponState(cart.couponCode)
    if (error) {
      cart.couponCode = null
      touchCart(cart)
    }
    const quote = storeQuote(draft)
    persist()
    scheduleCheckoutScenario(quote)
    return json(publicQuote(quote), 201)
  }),

  /** Revalida preço, disponibilidade, cupom e taxas. Se mudou, devolve nova cotação. */
  http.post(`${API}/quotes/:quoteId/validate`, async ({ request, params }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const prev = db().quotes[String(params.quoteId)]
    if (!prev) return notFound('Cotação')
    if (prev.ownerKey !== `user:${userId}`) return apiError(403, 'FORBIDDEN', 'Esta cotação pertence a outro usuário')
    const cart = currentCart(`user:${userId}`)
    const draft = buildQuoteFromCart(cart, prev.network)
    if (!draft.lines.length) return apiError(409, 'OUT_OF_STOCK', 'Os itens do carrinho não estão mais disponíveis')
    const expired = new Date(prev.expiresAt).getTime() < Date.now()
    const valid = !expired && draft.fingerprint === prev.fingerprint
    const quote = valid ? prev : storeQuote(draft)
    const changes = valid ? [] : diffQuotes(prev, draft)
    if (expired && !changes.length) changes.push({ kind: 'fee', message: 'A cotação expirou e foi recalculada' })
    persist()
    return json({ valid, quote: publicQuote(quote), changes })
  }),

  http.get(`${API}/quotes/:quoteId`, async ({ request, params }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const q = db().quotes[String(params.quoteId)]
    if (!q) return notFound('Cotação')
    if (q.ownerKey !== `user:${userId}`) return apiError(403, 'FORBIDDEN', 'Esta cotação pertence a outro usuário')
    return json(publicQuote(q))
  }),
]

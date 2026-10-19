import { http, delay } from 'msw'
import { CreateOrderInput } from '@/contracts'
import { buildQuoteFromCart, cartFor, db, findNft, hashString, nowIso, persist, publicOrder, stableStringify, storeQuote, touchCart, publicQuote, type DbOrder } from '../db'
import { API, apiError, json, network, notFound, readJson, requireUser, validationError } from '../http'
import { updateEdition } from '../mutations'
import { dropAllConnections, publishOrderUpdated } from '../realtime'
import { consumeOnce, getScenario, random } from '../scenarios'
import { walletConnections } from './wallets'

/** Tempo até a "blockchain" confirmar ou recusar o pagamento. */
export const SETTLEMENT_MS = 2000
/** Atraso da 1ª resposta no cenário order-timeout (maior que o timeout do cliente para pedidos). */
export const ORDER_TIMEOUT_DELAY_MS = 12000

function fakeTxHash() {
  let h = '0x'
  for (let i = 0; i < 64; i++) h += Math.floor(random() * 16).toString(16)
  return h
}

function settle(orderId: string) {
  const s = db()
  const order = s.orders[orderId]
  if (!order || order.status !== 'pending') return
  const declined = getScenario().paymentDeclined
  order.status = declined ? 'declined' : 'confirmed'
  order.version += 1
  order.updatedAt = nowIso()
  if (declined) {
    order.declineReason = 'Pagamento recusado pela carteira (saldo insuficiente na simulação)'
    // Libera o estoque reservado na criação.
    for (const l of order.lines) updateEdition(l.nftId, l.editionId, { delta: l.quantity })
  } else {
    order.transactionHash = fakeTxHash()
    order.explorerUrl = `https://etherscan.io/tx/${order.transactionHash}?simulated=1`
    // Remove do carrinho apenas os itens e quantidades comprados.
    const cart = cartFor(`user:${order.userId}`)
    for (const l of order.lines) {
      const line = cart.lines.find((c) => c.nftId === l.nftId && c.editionId === l.editionId)
      if (!line) continue
      line.quantity -= l.quantity
    }
    cart.lines = cart.lines.filter((c) => c.quantity > 0)
    if (cart.lines.length === 0) cart.couponCode = null
    touchCart(cart)
  }
  persist()
  publishOrderUpdated(order)
}

export const orderHandlers = [
  http.post(`${API}/orders`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const key = request.headers.get('idempotency-key')
    if (!key || key.length < 8) return apiError(422, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key obrigatório')
    const body = await readJson(request)
    const parsed = CreateOrderInput.safeParse(body)
    if (!parsed.success) return validationError(parsed.error.issues)
    const input = parsed.data
    const s = db()
    const requestHash = hashString(stableStringify(input))

    // Idempotência: mesma chave + mesmo conteúdo = mesmo pedido.
    const existingId = s.idempotency[`${userId}:${key}`]
    if (existingId) {
      const existing = s.orders[existingId]
      if (existing.requestHash !== requestHash) {
        return apiError(409, 'IDEMPOTENCY_CONFLICT', 'Esta chave de idempotência já foi usada com outro conteúdo')
      }
      return json(publicOrder(existing), 200)
    }

    const quote = s.quotes[input.quoteId]
    if (!quote) return notFound('Cotação')
    if (quote.ownerKey !== `user:${userId}`) return apiError(403, 'FORBIDDEN', 'Esta cotação pertence a outro usuário')
    if (quote.fingerprint !== input.quoteFingerprint) return apiError(409, 'PRICE_CHANGED', 'A cotação enviada não confere')

    // Revalidação: preço, disponibilidade, cupom e taxa precisam bater com a cotação.
    const cart = cartFor(`user:${userId}`)
    const fresh = buildQuoteFromCart(cart, input.network)
    const expired = new Date(quote.expiresAt).getTime() < Date.now()
    if (expired || fresh.fingerprint !== quote.fingerprint) {
      const outOfStock = quote.lines.some((l) => {
        const ed = findNft(l.nftId)?.editions.find((e) => e.id === l.editionId)
        return !ed || ed.available < l.quantity
      })
      const newQuote = fresh.lines.length ? publicQuote(storeQuote(fresh)) : null
      persist()
      return apiError(409, outOfStock ? 'OUT_OF_STOCK' : expired ? 'QUOTE_EXPIRED' : 'PRICE_CHANGED', outOfStock ? 'Um item ficou indisponível. Revise o pedido.' : 'Os valores mudaram. Revise e confirme novamente.', {
        details: { quote: newQuote },
      })
    }

    const wallet = s.wallets.find((w) => w.id === input.walletId && w.userId === userId)
    if (!wallet) return apiError(422, 'VALIDATION_ERROR', 'Carteira inválida', { fields: { walletId: 'Selecione uma carteira cadastrada' } })
    if (!wallet.networks.includes(input.network)) return apiError(422, 'VALIDATION_ERROR', 'Esta carteira não suporta a rede escolhida', { fields: { network: 'Rede não suportada pela carteira' } })
    const conn = walletConnections.get(userId)
    if (!conn || conn.walletId !== wallet.id || conn.network !== input.network) {
      return apiError(409, 'WALLET_DISCONNECTED', 'Conecte a carteira na rede escolhida antes de pagar')
    }

    s.counters.order += 1
    const now = nowIso()
    const order: DbOrder = {
      id: `ord_${s.counters.order}`,
      userId,
      requestHash,
      status: 'pending',
      idempotencyKey: key,
      lines: quote.lines,
      coupon: quote.coupon,
      summary: quote.summary,
      network: input.network,
      wallet: { id: wallet.id, label: wallet.label, address: wallet.address, provider: wallet.provider },
      buyer: { fullName: input.buyer.fullName, email: input.buyer.email, country: input.buyer.country },
      transactionHash: null,
      explorerUrl: null,
      declineReason: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    }
    s.orders[order.id] = order
    s.idempotency[`${userId}:${key}`] = order.id
    persist()
    // Reserva o estoque (emite nft.updated para todos).
    for (const l of order.lines) updateEdition(l.nftId, l.editionId, { delta: -l.quantity })

    const sc = getScenario()
    if (sc.socketDropDuringOrder && consumeOnce('socket-drop')) {
      // Derruba o socket antes da confirmação: o evento se perde e o cliente
      // precisa reconciliar via REST após reconectar.
      setTimeout(() => dropAllConnections(), 50)
    }
    setTimeout(() => settle(order.id), SETTLEMENT_MS)

    if (sc.orderTimeout && consumeOnce('order-timeout')) {
      await delay(ORDER_TIMEOUT_DELAY_MS)
    }
    return json(publicOrder(order), 201)
  }),

  http.get(`${API}/orders/:orderId`, async ({ request, params }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const order = db().orders[String(params.orderId)]
    if (!order) return notFound('Pedido')
    if (order.userId !== userId) return apiError(403, 'FORBIDDEN', 'Este pedido pertence a outro usuário')
    return json(publicOrder(order))
  }),

  /** Lista pedidos do usuário (opcionalmente por chave de idempotência, para recuperação). */
  http.get(`${API}/orders`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const key = new URL(request.url).searchParams.get('idempotencyKey')
    const items = Object.values(db().orders)
      .filter((o) => o.userId === userId && (!key || o.idempotencyKey === key))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(publicOrder)
    return json({ items })
  }),
]

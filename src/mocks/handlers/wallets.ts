import { http } from 'msw'
import { Network, WalletInput, type WalletConnection } from '@/contracts'
import { db, nextId, nowIso, persist, publicWallet } from '../db'
import { API, apiError, json, network, notFound, readJson, requireUser, validationError } from '../http'
import { getScenario } from '../scenarios'

/** Conexões de carteira ativas (estado de runtime, não persistido: some no refresh, como numa extensão real). */
export const walletConnections = new Map<string, { walletId: string; network: Network }>()

export function resetWalletConnections() {
  walletConnections.clear()
}

export const walletHandlers = [
  http.get(`${API}/wallets`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const items = db()
      .wallets.filter((w) => w.userId === userId)
      .sort((a, b) => (a.role === 'primary' ? -1 : 1) - (b.role === 'primary' ? -1 : 1))
      .map(publicWallet)
    return json({ items })
  }),

  http.post(`${API}/wallets`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const parsed = WalletInput.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error.issues)
    const s = db()
    const input = parsed.data
    if (s.wallets.some((w) => w.userId === userId && w.role === input.role)) {
      return apiError(409, 'CONFLICT', `Você já tem uma carteira ${input.role === 'primary' ? 'principal' : 'secundária'}`, {
        fields: { role: 'Já existe uma carteira com esta função. Edite a existente.' },
      })
    }
    if (s.wallets.some((w) => w.userId === userId && w.address.toLowerCase() === input.address.toLowerCase())) {
      return apiError(409, 'CONFLICT', 'Este endereço já está cadastrado', { fields: { address: 'Endereço já cadastrado' } })
    }
    const wallet = { ...input, id: nextId('wal'), userId, updatedAt: nowIso() }
    s.wallets.push(wallet)
    persist()
    return json(publicWallet(wallet), 201)
  }),

  http.patch(`${API}/wallets/:walletId`, async ({ request, params }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const s = db()
    const wallet = s.wallets.find((w) => w.id === params.walletId)
    if (!wallet) return notFound('Carteira')
    if (wallet.userId !== userId) return apiError(403, 'FORBIDDEN', 'Esta carteira pertence a outro usuário')
    const parsed = WalletInput.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error.issues)
    const input = parsed.data
    if (s.wallets.some((w) => w.userId === userId && w.id !== wallet.id && w.role === input.role)) {
      return apiError(409, 'CONFLICT', 'Já existe uma carteira com esta função', { fields: { role: 'Já existe uma carteira com esta função' } })
    }
    if (s.wallets.some((w) => w.userId === userId && w.id !== wallet.id && w.address.toLowerCase() === input.address.toLowerCase())) {
      return apiError(409, 'CONFLICT', 'Este endereço já está cadastrado', { fields: { address: 'Endereço já cadastrado' } })
    }
    Object.assign(wallet, input, { updatedAt: nowIso() })
    const conn = walletConnections.get(userId)
    if (conn?.walletId === wallet.id && !wallet.networks.includes(conn.network)) walletConnections.delete(userId)
    persist()
    return json(publicWallet(wallet))
  }),

  // Simulação de conexão de carteira ------------------------------------------

  http.get(`${API}/wallets/connection`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const conn = walletConnections.get(userId)
    return json(conn ? ({ ...conn, status: 'connected' } satisfies WalletConnection) : null)
  }),

  http.post(`${API}/wallets/:walletId/connect`, async ({ request, params }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const wallet = db().wallets.find((w) => w.id === params.walletId)
    if (!wallet) return notFound('Carteira')
    if (wallet.userId !== userId) return apiError(403, 'FORBIDDEN', 'Esta carteira pertence a outro usuário')
    const body = await readJson<{ network?: unknown }>(request)
    const net = Network.safeParse(body?.network)
    if (!net.success) return validationError(net.error.issues)
    if (!wallet.networks.includes(net.data)) return apiError(422, 'VALIDATION_ERROR', 'Esta carteira não suporta a rede escolhida', { fields: { network: 'Rede não suportada' } })
    if (getScenario().walletRejects) return apiError(409, 'WALLET_REJECTED', 'A conexão foi recusada na carteira')
    walletConnections.set(userId, { walletId: wallet.id, network: net.data })
    return json({ walletId: wallet.id, network: net.data, status: 'connected' } satisfies WalletConnection)
  }),

  http.post(`${API}/wallets/:walletId/disconnect`, async ({ request, params }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const conn = walletConnections.get(userId)
    if (conn?.walletId === params.walletId) walletConnections.delete(userId)
    return json({ walletId: String(params.walletId), network: conn?.network ?? 'ethereum', status: 'disconnected' } satisfies WalletConnection)
  }),
]

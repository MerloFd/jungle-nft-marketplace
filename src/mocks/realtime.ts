/**
 * Servidor Socket.IO simulado com MSW (`ws.link`) + `@mswjs/socket.io-binding`.
 *
 * Transporte: apenas WebSocket. O MSW intercepta conexões WebSocket, não o
 * long-polling HTTP do Engine.IO, por isso o cliente usa `transports: ['websocket']`.
 *
 * Limitações conhecidas (binding 0.2.0): somente namespace padrão "/", sem
 * acknowledgements e sem anexos binários. O handshake (`0{...}` / `40`) é
 * enviado pelo binding; o heartbeat (ping `2`) é enviado aqui, porque o
 * cliente derruba a conexão se não receber ping em pingInterval+pingTimeout.
 *
 * Autenticação: o cliente envia o token no pacote CONNECT (`40{"token":"..."}`).
 * Eventos de pedido só são entregues a conexões do dono do pedido.
 */
import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NftDetail, NftUpdatedEvent, OrderUpdatedEvent, RealtimeEvent } from '@/contracts'
import { db, nextEventId, nowIso } from './db'
import type { DbOrder } from './db'

type IoConnection = ReturnType<typeof toSocketIo>

interface Peer {
  id: number
  io: IoConnection
  close: () => void
  userId: string | null
  heartbeat: ReturnType<typeof setInterval>
}

const peers = new Set<Peer>()
let peerSeq = 0
/** Último evento emitido (para testes de duplicata). */
let lastEvent: RealtimeEvent | null = null
/** Histórico curto por recurso (para testes de evento antigo). */
const history = new Map<string, RealtimeEvent[]>()

/**
 * O cliente usa `path: '/realtime/'`. Não usamos o path padrão `/socket.io/`
 * porque o MSW remove esse prefixo antes de casar a URL, o que faria o handler
 * casar com a raiz do host (e capturar o WebSocket de HMR do Vite).
 */
export const REALTIME_PATH = '/realtime/'
export const realtimeLink = ws.link(/\/realtime\/$/)

function userIdFromToken(token: unknown): string | null {
  if (typeof token !== 'string') return null
  const session = db().sessions.find((s) => s.token === token)
  if (!session) return null
  if (new Date(session.expiresAt).getTime() < Date.now()) return null
  return session.userId
}

export const realtimeHandler = realtimeLink.addEventListener('connection', (connection) => {
  const io = toSocketIo(connection)
  const peer: Peer = {
    id: ++peerSeq,
    io,
    close: () => connection.client.close(),
    userId: null,
    heartbeat: setInterval(() => {
      try {
        connection.client.send('2')
      } catch {
        /* conexão já encerrada */
      }
    }, 20_000),
  }
  peers.add(peer)

  connection.client.addEventListener('message', (event) => {
    const data = event.data
    if (typeof data === 'string' && data.startsWith('40')) {
      try {
        const auth = data.length > 2 ? (JSON.parse(data.slice(2)) as { token?: string }) : {}
        peer.userId = userIdFromToken(auth.token)
      } catch {
        peer.userId = null
      }
    }
  })

  connection.client.addEventListener('close', () => {
    clearInterval(peer.heartbeat)
    peers.delete(peer)
  })
})

function remember(event: RealtimeEvent) {
  lastEvent = event
  const key = `${event.resource.type}:${event.resource.id}`
  const list = history.get(key) ?? []
  list.push(event)
  history.set(key, list.slice(-10))
}

function emitTo(predicate: (p: Peer) => boolean, event: RealtimeEvent) {
  for (const p of peers) {
    if (predicate(p)) p.io.client.emit(event.type, event)
  }
}

export function publishNftUpdated(nft: NftDetail) {
  const event: NftUpdatedEvent = {
    eventId: nextEventId(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: nowIso(),
    data: {
      nftId: nft.id,
      floorPriceEth: nft.floorPriceEth,
      available: nft.available,
      editions: nft.editions.map((e) => ({ id: e.id, priceEth: e.priceEth, available: e.available })),
    },
  }
  remember(event)
  emitTo(() => true, event)
  return event
}

export function publishOrderUpdated(order: DbOrder) {
  const event: OrderUpdatedEvent = {
    eventId: nextEventId(),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: nowIso(),
    userId: order.userId,
    data: {
      orderId: order.id,
      status: order.status,
      transactionHash: order.transactionHash,
      declineReason: order.declineReason,
    },
  }
  remember(event)
  emitTo((p) => p.userId === order.userId, event)
  return event
}

// ---------------------------------------------------------------------------
// Controles para testes / painel de mocks
// ---------------------------------------------------------------------------

/** Reenvia o último evento (mesmo eventId e versão): o cliente deve ignorar. */
export function emitDuplicateOfLast() {
  if (!lastEvent) return null
  const e = lastEvent
  emitTo((p) => (e.type === 'order.updated' ? p.userId === e.userId : true), e)
  return e
}

/** Reenvia um evento antigo de um recurso (versão menor): o cliente não pode regredir. */
export function emitStale(resourceType: 'nft' | 'order', id: string) {
  const list = history.get(`${resourceType}:${id}`)
  if (!list || list.length < 2) return null
  const e = list[0]
  emitTo((p) => (e.type === 'order.updated' ? p.userId === e.userId : true), e)
  return e
}

/** Derruba todas as conexões (o cliente Socket.IO reconecta sozinho). */
export function dropAllConnections() {
  for (const p of [...peers]) p.close()
}

/** Encerra as conexões de um usuário (logout): eventos da sessão anterior não vazam. */
export function dropUserConnections(userId: string) {
  for (const p of [...peers]) if (p.userId === userId) p.close()
}

export function connectedPeers() {
  return [...peers].map((p) => ({ id: p.id, userId: p.userId }))
}

export function resetRealtime() {
  lastEvent = null
  history.clear()
}

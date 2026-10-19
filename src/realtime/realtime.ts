/**
 * Cliente de tempo real (socket.io-client).
 *
 * Garantias:
 * - Idempotência de eventos: ignora `eventId` já visto e versões menores ou
 *   iguais à última aplicada por recurso (duplicatas e eventos antigos não
 *   regridem o estado nem reaplicam efeitos).
 * - Isolamento: o socket é recriado a cada troca de sessão (token no CONNECT);
 *   o registro de versões é zerado; eventos `order.updated` de outro userId
 *   são descartados.
 * - Reconexão: ao reconectar, invalida as queries ativas para reconciliar
 *   catálogo, carrinho e pedidos com a API REST.
 * - Ciclo de vida: `start()` devolve uma função que remove listeners e
 *   desconecta (chamada no cleanup do efeito e no logout).
 */
import { io, type Socket } from 'socket.io-client'
import type { QueryClient } from '@tanstack/react-query'
import {
  NftUpdatedEvent,
  OrderUpdatedEvent,
  type NftDetail,
  type NftListResponse,
  type NftSummary,
  type Order,
  type RealtimeEvent,
  type FeaturedResponse,
} from '@/contracts'
import { qk } from '@/lib/query-keys'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

type Listener<T> = (e: T) => void

/** Barramento para a UI reagir a eventos já validados e aplicados ao cache. */
const busListeners = {
  'nft.updated': new Set<Listener<NftUpdatedEvent>>(),
  'order.updated': new Set<Listener<OrderUpdatedEvent>>(),
  reconnect: new Set<Listener<void>>(),
}

export const realtimeBus = {
  on<K extends keyof typeof busListeners>(type: K, fn: K extends 'nft.updated' ? Listener<NftUpdatedEvent> : K extends 'order.updated' ? Listener<OrderUpdatedEvent> : Listener<void>) {
    const set = busListeners[type] as Set<typeof fn>
    set.add(fn)
    return () => {
      set.delete(fn)
    }
  },
}

// ---------------------------------------------------------------------------
// Status da conexão (useSyncExternalStore)
// ---------------------------------------------------------------------------

let status: ConnectionStatus = 'idle'
const statusListeners = new Set<() => void>()
declare global {
  interface Window {
    /** Diagnóstico para testes E2E: status atual do socket. */
    __realtimeStatus?: ConnectionStatus
  }
}

function setStatus(s: ConnectionStatus) {
  status = s
  window.__realtimeStatus = s
  for (const fn of statusListeners) fn()
}
export const connectionStatusStore = {
  get: () => status,
  subscribe: (fn: () => void) => {
    statusListeners.add(fn)
    return () => {
      statusListeners.delete(fn)
    }
  },
}

// ---------------------------------------------------------------------------
// Registro de versões
// ---------------------------------------------------------------------------

const seenEventIds = new Set<string>()
const lastVersion = new Map<string, number>()

function shouldApply(e: RealtimeEvent): boolean {
  if (seenEventIds.has(e.eventId)) return false
  const key = `${e.resource.type}:${e.resource.id}`
  const prev = lastVersion.get(key) ?? 0
  if (e.version <= prev) return false
  seenEventIds.add(e.eventId)
  if (seenEventIds.size > 500) seenEventIds.delete(seenEventIds.values().next().value!)
  lastVersion.set(key, e.version)
  return true
}

/** Registra a versão vista via REST para não aplicar evento mais antigo depois. */
export function noteResourceVersion(type: 'nft' | 'order', id: string, version: number) {
  const key = `${type}:${id}`
  if ((lastVersion.get(key) ?? 0) < version) lastVersion.set(key, version)
}

export function resetRealtimeState() {
  seenEventIds.clear()
  lastVersion.clear()
}

// ---------------------------------------------------------------------------
// Aplicação no cache
// ---------------------------------------------------------------------------

function patchSummary(item: NftSummary, e: NftUpdatedEvent): NftSummary {
  if (item.id !== e.data.nftId || item.version >= e.version) return item
  return { ...item, floorPriceEth: e.data.floorPriceEth, available: e.data.available, version: e.version }
}

function applyNftUpdated(qc: QueryClient, e: NftUpdatedEvent) {
  qc.setQueryData<NftDetail>(qk.nfts.detail(e.data.nftId), (old) => {
    if (!old || old.version >= e.version) return old
    return {
      ...old,
      floorPriceEth: e.data.floorPriceEth,
      available: e.data.available,
      version: e.version,
      editions: old.editions.map((ed) => {
        const upd = e.data.editions.find((x) => x.id === ed.id)
        return upd ? { ...ed, priceEth: upd.priceEth, available: upd.available } : ed
      }),
    }
  })
  qc.setQueriesData<NftListResponse>({ queryKey: qk.nfts.lists }, (old) => (old ? { ...old, items: old.items.map((i) => patchSummary(i, e)) } : old))
  qc.setQueryData<FeaturedResponse>(qk.nfts.featured, (old) => (old ? { ...old, items: old.items.map((i) => patchSummary(i, e)) } : old))
  // O carrinho é recalculado pela API (avisos de preço/estoque e resumo coerente).
  void qc.invalidateQueries({ queryKey: ['cart'] })
}

function applyOrderUpdated(qc: QueryClient, e: OrderUpdatedEvent, userId: string) {
  qc.setQueryData<Order>(qk.order(userId, e.data.orderId), (old) => {
    if (!old || old.version >= e.version) return old
    return { ...old, status: e.data.status, transactionHash: e.data.transactionHash, declineReason: e.data.declineReason, version: e.version }
  })
  // Busca o recibo completo (snapshot do servidor) e o carrinho atualizado.
  void qc.invalidateQueries({ queryKey: qk.order(userId, e.data.orderId) })
  if (e.data.status === 'confirmed') void qc.invalidateQueries({ queryKey: ['cart'] })
}

// ---------------------------------------------------------------------------
// Conexão
// ---------------------------------------------------------------------------

export interface StartOptions {
  queryClient: QueryClient
  token: string | null
  userId: string | null
}

let activeSocket: Socket | null = null

export function startRealtime({ queryClient, token, userId }: StartOptions): () => void {
  resetRealtimeState()
  setStatus('connecting')
  let everConnected = false

  const socket = io(window.location.origin, {
    path: '/realtime/',
    transports: ['websocket'],
    auth: token ? { token } : {},
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
  })
  activeSocket = socket

  const onConnect = () => {
    setStatus('connected')
    if (everConnected) {
      // Reconciliação após reconexão: eventos perdidos durante a queda.
      void queryClient.invalidateQueries({ type: 'active' })
      for (const fn of busListeners.reconnect) fn()
    }
    everConnected = true
  }
  const onDisconnect = (reason: Socket.DisconnectReason) => {
    setStatus(reason === 'io client disconnect' ? 'disconnected' : 'reconnecting')
  }
  const onNft = (raw: unknown) => {
    const parsed = NftUpdatedEvent.safeParse(raw)
    if (!parsed.success || !shouldApply(parsed.data)) return
    applyNftUpdated(queryClient, parsed.data)
    for (const fn of busListeners['nft.updated']) fn(parsed.data)
  }
  const onOrder = (raw: unknown) => {
    const parsed = OrderUpdatedEvent.safeParse(raw)
    if (!parsed.success) return
    if (!userId || parsed.data.userId !== userId) return // evento de outra sessão
    if (!shouldApply(parsed.data)) return
    applyOrderUpdated(queryClient, parsed.data, userId)
    for (const fn of busListeners['order.updated']) fn(parsed.data)
  }

  socket.on('connect', onConnect)
  socket.on('disconnect', onDisconnect)
  socket.io.on('reconnect_attempt', () => setStatus('reconnecting'))
  socket.on('nft.updated', onNft)
  socket.on('order.updated', onOrder)

  return () => {
    socket.off('connect', onConnect)
    socket.off('disconnect', onDisconnect)
    socket.off('nft.updated', onNft)
    socket.off('order.updated', onOrder)
    socket.io.removeAllListeners('reconnect_attempt')
    socket.disconnect()
    if (activeSocket === socket) activeSocket = null
    setStatus('disconnected')
  }
}

/** Para diagnósticos/testes. */
export function getActiveSocket() {
  return activeSocket
}

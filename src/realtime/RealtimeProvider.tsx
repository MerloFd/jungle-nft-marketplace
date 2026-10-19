import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { tokenStore } from '@/lib/http'
import { onTokenChange, useSession } from '@/features/session/session'
import { connectionStatusStore, realtimeBus, startRealtime } from './realtime'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/contracts'

/**
 * Mantém um socket por sessão. Quando o usuário muda (login, logout, troca),
 * o socket anterior é encerrado com todos os listeners e um novo é aberto.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const { user, isPending } = useSession()
  const userId = user?.id ?? null
  const token = useSyncExternalStore(onTokenChange, tokenStore.get, tokenStore.get)

  useEffect(() => {
    if (isPending) return
    return startRealtime({ queryClient: qc, token: userId ? token : null, userId })
  }, [qc, userId, token, isPending])

  return children
}

export function useConnectionStatus() {
  return useSyncExternalStore(connectionStatusStore.subscribe, connectionStatusStore.get, connectionStatusStore.get)
}

/** Assina eventos já validados/deduplicados. O listener é liberado no unmount. */
export function useRealtimeEvent(type: 'nft.updated', fn: (e: NftUpdatedEvent) => void): void
export function useRealtimeEvent(type: 'order.updated', fn: (e: OrderUpdatedEvent) => void): void
export function useRealtimeEvent(type: 'reconnect', fn: () => void): void
export function useRealtimeEvent(type: 'nft.updated' | 'order.updated' | 'reconnect', fn: (e: never) => void) {
  useEffect(() => realtimeBus.on(type as 'reconnect', fn as () => void), [type, fn])
}

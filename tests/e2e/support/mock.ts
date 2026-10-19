/**
 * Tipos e utilitários de acesso ao `window.__mock` dentro dos testes.
 *
 * Os testes não importam de `src/` (o projeto de tipos dos testes é o
 * tsconfig.node.json, sem o alias `@/`), então a superfície de controle é
 * declarada aqui, espelhando `src/mocks/control.ts`.
 */

export type ScenarioName =
  | 'default'
  | 'fast'
  | 'slow'
  | 'variable'
  | 'empty'
  | 'offline'
  | 'server-error'
  | 'flaky'
  | 'favorites-error'
  | 'session-expired'
  | 'price-change'
  | 'sold-out'
  | 'order-timeout'
  | 'payment-declined'
  | 'wallet-rejects'
  | 'socket-drop'

export interface MockControl {
  getScenario(): ScenarioName
  setScenario(name: ScenarioName): void
  setLatencyFactor(n: number): void
  reset(): Promise<void>
  expireSessions(): void
  updateEdition(nftId: string, editionId: string, patch: { priceEth?: string; available?: number }): unknown
  getNft(id: string): unknown
  emitDuplicateOfLast(): unknown
  emitStale(type: 'nft' | 'order', id: string): unknown
  dropSockets(): unknown
  connectedPeers(): number
  disconnectWallet(userId?: string): void
  state(): {
    nfts: Array<{ id: string; name: string; editions: Array<{ id: string; priceEth: string; available: number }> }>
    orders: Array<{ id: string; status: string; idempotencyKey: string }>
    [key: string]: unknown
  }
}

declare global {
  interface Window {
    __mock?: MockControl
    __mockReady?: boolean
    __realtimeStatus?: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  }
}

export const USERS = {
  ana: { email: 'ana@jungle.dev', password: 'jungle123' },
  bruno: { email: 'bruno@jungle.dev', password: 'jungle123' },
} as const

export const COUPONS = {
  valid: 'JUNGLE10',
  alsoValid: 'WELCOME5',
  expired: 'EXPIRED20',
  invalid: 'NAOEXISTE',
} as const

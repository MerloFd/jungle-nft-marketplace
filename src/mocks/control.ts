/**
 * API de controle dos mocks, exposta em `window.__mock`.
 * Usada pelos testes Playwright (via page.evaluate) e pelo painel de mocks.
 */
import { db, findNft, persist, resetDb, snapshot } from './db'
import { updateEdition } from './mutations'
import { connectedPeers, dropAllConnections, emitDuplicateOfLast, emitStale, resetRealtime } from './realtime'
import { SCENARIOS, getScenario, setLatencyFactor, setScenario, type ScenarioName } from './scenarios'
import { resetWalletConnections, walletConnections } from './handlers/wallets'

export const mockControl = {
  scenarios: Object.values(SCENARIOS).map((s) => ({ name: s.name, description: s.description })),
  getScenario: () => getScenario().name,
  setScenario: (name: ScenarioName) => setScenario(name),
  setLatencyFactor,
  /** Restaura o seed (catálogo, usuários, carrinhos, pedidos, carteiras). */
  async reset() {
    await resetDb()
    resetRealtime()
    resetWalletConnections()
  },
  /** Expira todas as sessões agora (próxima requisição autenticada recebe 401 SESSION_EXPIRED). */
  expireSessions() {
    const past = new Date(Date.now() - 1000).toISOString()
    for (const s of db().sessions) s.expiresAt = past
    persist()
  },
  /** Altera preço/estoque de uma edição: reflete no REST e emite nft.updated. */
  updateEdition(nftId: string, editionId: string, patch: { priceEth?: string; available?: number }) {
    return updateEdition(nftId, editionId, patch)
  },
  getNft: (id: string) => findNft(id),
  emitDuplicateOfLast,
  emitStale,
  dropSockets: dropAllConnections,
  connectedPeers,
  disconnectWallet(userId?: string) {
    if (userId) walletConnections.delete(userId)
    else walletConnections.clear()
  },
  state: snapshot,
}

export type MockControl = typeof mockControl

declare global {
  interface Window {
    __mock?: MockControl
    __mockReady?: boolean
  }
}

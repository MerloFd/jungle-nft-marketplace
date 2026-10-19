/**
 * Cenários de rede e de negócio da camada de mocks.
 *
 * Seleção (em ordem de prioridade):
 *  1. `?scenario=<nome>` na URL (persistido em localStorage)
 *  2. `window.__mock.setScenario(nome)` (usado pelos testes Playwright)
 *  3. localStorage `mock:scenario`
 *  4. `default`
 *
 * Todos os cenários são determinísticos: a latência "variável" usa um PRNG
 * semeado (mulberry32) reiniciado no reset, então a mesma sequência de
 * requisições produz a mesma sequência de atrasos.
 */

export type LatencyMode = 'none' | 'default' | 'slow' | 'variable'

export interface ScenarioConfig {
  name: ScenarioName
  description: string
  latency: LatencyMode
  /** Catálogo responde lista vazia. */
  emptyCatalog?: boolean
  /** Falha de conexão (rede indisponível) em todas as requisições REST. */
  offline?: boolean
  /** 500 nas consultas do catálogo (lista e detalhe). */
  catalogError?: boolean
  /** 503 transitório na PRIMEIRA consulta do catálogo; a segunda funciona. */
  catalogFlaky?: boolean
  /** Mutations de favoritos falham com 500. */
  favoritesError?: boolean
  /** Próxima requisição autenticada responde 401 SESSION_EXPIRED. */
  sessionExpiresSoon?: boolean
  /** Depois de criar a cotação, o preço do 1º item sobe (via nft.updated). */
  priceChangeDuringCheckout?: boolean
  /** Depois de criar a cotação, a edição do 1º item esgota (via nft.updated). */
  soldOutDuringCheckout?: boolean
  /** POST /orders cria o pedido mas a 1ª resposta demora mais que o timeout do cliente. */
  orderTimeout?: boolean
  /** Pagamento recusado na simulação. */
  paymentDeclined?: boolean
  /** Carteira recusa a conexão. */
  walletRejects?: boolean
  /** Socket cai logo após o pedido ser criado (pedido fica pendente até reconectar). */
  socketDropDuringOrder?: boolean
}

export const SCENARIOS = {
  default: { name: 'default', description: 'Sucesso com latência realista (150 a 400ms)', latency: 'default' },
  fast: { name: 'fast', description: 'Sucesso sem latência (testes)', latency: 'none' },
  slow: { name: 'slow', description: 'Rede lenta (2,5s por requisição)', latency: 'slow' },
  variable: { name: 'variable', description: 'Latência variável (100ms a 2s), gera respostas fora de ordem', latency: 'variable' },
  empty: { name: 'empty', description: 'Catálogo sem resultados', latency: 'default', emptyCatalog: true },
  offline: { name: 'offline', description: 'Sem conexão com a API', latency: 'none', offline: true },
  'server-error': { name: 'server-error', description: 'Catálogo responde 500', latency: 'default', catalogError: true },
  flaky: { name: 'flaky', description: 'Primeira consulta do catálogo falha (503), a nova tentativa funciona', latency: 'default', catalogFlaky: true },
  'favorites-error': { name: 'favorites-error', description: 'Falha ao favoritar (rollback do otimista)', latency: 'default', favoritesError: true },
  'session-expired': { name: 'session-expired', description: 'Sessão expira na próxima requisição autenticada', latency: 'default', sessionExpiresSoon: true },
  'price-change': { name: 'price-change', description: 'Preço do item muda durante o checkout', latency: 'default', priceChangeDuringCheckout: true },
  'sold-out': { name: 'sold-out', description: 'Edição esgota durante o checkout', latency: 'default', soldOutDuringCheckout: true },
  'order-timeout': { name: 'order-timeout', description: 'Timeout após criar o pedido (recuperação por idempotência)', latency: 'default', orderTimeout: true },
  'payment-declined': { name: 'payment-declined', description: 'Pagamento recusado', latency: 'default', paymentDeclined: true },
  'wallet-rejects': { name: 'wallet-rejects', description: 'Carteira recusa a conexão', latency: 'default', walletRejects: true },
  'socket-drop': { name: 'socket-drop', description: 'Conexão em tempo real cai com pedido pendente', latency: 'default', socketDropDuringOrder: true },
} as const satisfies Record<string, Omit<ScenarioConfig, 'name'> & { name: string }>

export type ScenarioName = keyof typeof SCENARIOS

const STORAGE_KEY = 'mock:scenario'

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* sem storage: cenário fica só em memória */
  }
}

function isScenario(v: string | null): v is ScenarioName {
  return !!v && v in SCENARIOS
}

let current: ScenarioName = 'default'
/** Flags consumíveis (ex.: "falhar só a 1ª vez"). Reiniciadas a cada troca de cenário. */
const consumed = new Set<string>()

export function initScenario() {
  const fromUrl = new URLSearchParams(window.location.search).get('scenario')
  if (isScenario(fromUrl)) {
    current = fromUrl
    safeSet(STORAGE_KEY, fromUrl)
    return
  }
  const stored = safeGet(STORAGE_KEY)
  if (isScenario(stored)) current = stored
}

export function getScenario(): ScenarioConfig {
  return SCENARIOS[current] as ScenarioConfig
}

export function setScenario(name: ScenarioName) {
  if (!isScenario(name)) throw new Error(`Cenário desconhecido: ${name}`)
  current = name
  consumed.clear()
  safeSet(STORAGE_KEY, name)
}

/** Retorna true apenas na primeira chamada com essa chave dentro do cenário atual. */
export function consumeOnce(key: string): boolean {
  if (consumed.has(key)) return false
  consumed.add(key)
  return true
}

// ---------------------------------------------------------------------------
// PRNG determinístico (mulberry32)
// ---------------------------------------------------------------------------

let seed = 42
export function resetRandom(s = 42) {
  seed = s
}
export function random(): number {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Atraso em ms para a requisição atual, segundo o cenário. */
export function nextLatency(): number {
  switch (getScenario().latency) {
    case 'none':
      return 0
    case 'slow':
      return 2500
    case 'variable':
      return Math.round(100 + random() * 1900)
    case 'default':
    default:
      return Math.round(150 + random() * 250)
  }
}

/** Multiplicador global de latência (testes podem zerar com window.__mock.setLatencyFactor(0)). */
let latencyFactor = 1
export function setLatencyFactor(f: number) {
  latencyFactor = f
}
export function getLatencyFactor() {
  return latencyFactor
}

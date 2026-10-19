/**
 * Estado do checkout que precisa sobreviver a refresh, a uma reconexão e a um
 * desvio para o login (sessão expirada no meio do fluxo).
 *
 * sessionStorage (e não localStorage) porque é um rascunho de uma compra em
 * andamento naquela aba: não deve reaparecer em outra aba nem dias depois.
 */
import type { Network } from '@/contracts'

const BUYER_KEY = 'checkout:buyer'
/** Nome exigido pelos testes E2E. Guarda a tentativa inteira (chave + cotação). */
const ATTEMPT_KEY = 'checkout:idempotencyKey'
const NETWORK_KEY = 'checkout:network'

/**
 * Rascunho do formulário do colecionador (aceite dos termos incluído).
 * `type` e não `interface`: o `useFormState` compartilhado exige um tipo com
 * índice implícito (`Record<string, unknown>`).
 */
export type BuyerDraft = {
  fullName: string
  email: string
  country: string
  acceptTerms: boolean
}

export const emptyBuyerDraft: BuyerDraft = { fullName: '', email: '', country: '', acceptTerms: false }

/**
 * Tentativa de compra: a Idempotency-Key vale para UMA intenção de compra,
 * identificada pela cotação exata que o usuário viu e aceitou. Reenvios após
 * timeout usam a mesma chave; uma cotação diferente começa outra tentativa.
 */
export interface OrderAttempt {
  key: string
  quoteId: string
  fingerprint: string
}

function read<T>(storageKey: string, parse: (value: unknown) => T | null): T | null {
  try {
    const raw = sessionStorage.getItem(storageKey)
    if (!raw) return null
    return parse(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

function write(storageKey: string, value: unknown) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(value))
  } catch {
    /* storage indisponível (modo privado): o fluxo continua só em memória */
  }
}

function drop(storageKey: string) {
  try {
    sessionStorage.removeItem(storageKey)
  } catch {
    /* idem */
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

export const buyerDraftStore = {
  get(): BuyerDraft | null {
    return read(BUYER_KEY, (v) =>
      isRecord(v)
        ? { fullName: str(v.fullName), email: str(v.email), country: str(v.country), acceptTerms: v.acceptTerms === true }
        : null,
    )
  },
  set(draft: BuyerDraft) {
    write(BUYER_KEY, draft)
  },
  clear() {
    drop(BUYER_KEY)
  },
}

export const attemptStore = {
  get(): OrderAttempt | null {
    return read(ATTEMPT_KEY, (v) =>
      isRecord(v) && str(v.key).length >= 8 ? { key: str(v.key), quoteId: str(v.quoteId), fingerprint: str(v.fingerprint) } : null,
    )
  },
  set(attempt: OrderAttempt) {
    write(ATTEMPT_KEY, attempt)
  },
  clear() {
    drop(ATTEMPT_KEY)
  },
}

/** Rede escolhida na etapa da carteira, para o refresh não perder a escolha. */
export const networkStore = {
  get(): Network | null {
    return read(NETWORK_KEY, (v) => (v === 'ethereum' || v === 'polygon' || v === 'arbitrum' ? v : null))
  },
  set(network: Network) {
    write(NETWORK_KEY, network)
  },
  clear() {
    drop(NETWORK_KEY)
  },
}

/** Fim do fluxo (pedido existente, com status final ou não): limpa o rascunho. */
export function clearCheckoutDraft() {
  attemptStore.clear()
  networkStore.clear()
  buyerDraftStore.clear()
}

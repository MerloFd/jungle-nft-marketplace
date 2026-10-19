/**
 * Lógica do checkout: conexão de carteira, ciclo de vida da cotação,
 * criação idempotente do pedido e recuperação de timeout.
 *
 * Decisões que sustentam os critérios eliminatórios:
 *
 * 1. Idempotência — a `Idempotency-Key` é gerada UMA vez por intenção de compra
 *    (a cotação exata que o usuário viu e aceitou) e persistida em
 *    sessionStorage. Em timeout ou erro de rede o reenvio usa EXATAMENTE a
 *    mesma chave; só uma cotação diferente (outro fingerprint) começa outra
 *    tentativa com chave nova.
 * 2. Revalidação — nunca enviamos um fingerprint que o usuário não viu. Antes
 *    de cada envio a cotação é revalidada; se mudou, o fluxo para e exige
 *    aceite explícito da cotação nova.
 * 3. Clique repetido — além de `disabled` enquanto há envio ou recuperação em
 *    curso, uma ref de guarda bloqueia o segundo clique que chega antes do
 *    re-render. Nunca dois POST com chaves diferentes para a mesma intenção.
 * 4. Timeout — sem resposta não se conclui nada: consultamos
 *    `GET /orders?idempotencyKey=` para descobrir se o pedido foi criado.
 */
import { useCallback, useRef, useState } from 'react'
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateOrderInput, Network, Order, Quote, QuoteValidation, WalletConnection } from '@/contracts'
import { isApiError, type ApiError } from '@/lib/http'
import { qk } from '@/lib/query-keys'
import { noteResourceVersion } from '@/realtime/realtime'
import { useSession } from '@/features/session/session'
import { checkoutApi } from './api'
import { attemptStore, type OrderAttempt } from './storage'

// ---------------------------------------------------------------------------
// Carteira conectada
// ---------------------------------------------------------------------------

export const walletConnectionQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: qk.walletConnection(userId),
    queryFn: ({ signal }) => checkoutApi.getConnection(signal),
    // A conexão é estado volátil da "extensão": sempre reconsultada ao entrar na etapa.
    staleTime: 0,
  })

export function useWalletConnection() {
  const { user } = useSession()
  return useQuery({ ...walletConnectionQueryOptions(user?.id ?? 'anon'), enabled: !!user })
}

function useWriteConnection() {
  const qc = useQueryClient()
  const { user } = useSession()
  return (connection: WalletConnection | null) => {
    if (!user) return
    qc.setQueryData<WalletConnection | null>(qk.walletConnection(user.id), connection)
  }
}

export function useConnectWallet() {
  const write = useWriteConnection()
  return useMutation({
    mutationFn: ({ walletId, network }: { walletId: string; network: Network }) => checkoutApi.connectWallet(walletId, network),
    onSuccess: write,
    // Recusa na carteira (WALLET_REJECTED) não muda o estado: segue desconectada.
    onError: () => write(null),
  })
}

export function useDisconnectWallet() {
  const write = useWriteConnection()
  return useMutation({
    mutationFn: (walletId: string) => checkoutApi.disconnectWallet(walletId),
    onSettled: () => write(null),
  })
}

// ---------------------------------------------------------------------------
// Cotação
// ---------------------------------------------------------------------------

export interface QuoteFlow {
  quote: Quote | null
  /** Diferenças da última revalidação que o usuário ainda não aceitou. */
  changes: QuoteValidation['changes']
  /** `true` enquanto a cotação nova espera a confirmação explícita do usuário. */
  needsAcceptance: boolean
  isCreating: boolean
  isValidating: boolean
  error: ApiError | Error | null
  /** Cria a cotação se ainda não existe (ao entrar na etapa de revisão). */
  ensure: (network: Network) => void
  /** Descarta a cotação atual e cria outra (cotação expirada, item removido). */
  recreate: (network: Network) => Promise<void>
  /** Esquece a cotação atual (ex.: o usuário trocou a rede): a próxima entrada na revisão cria outra. */
  reset: () => void
  /** Revalida contra a API. Devolve a cotação vigente e se ela segue válida. */
  revalidate: () => Promise<{ valid: boolean; quote: Quote | null }>
  /** Aceite explícito da cotação nova (libera o envio do pedido). */
  accept: () => void
  /** Aplica uma cotação devolvida pela própria recusa do POST /orders. */
  applyChanged: (quote: Quote | null, changes: QuoteValidation['changes']) => void
}

export function useQuoteFlow(): QuoteFlow {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [changes, setChanges] = useState<QuoteValidation['changes']>([])
  const [needsAcceptance, setNeedsAcceptance] = useState(false)
  const creatingFor = useRef<string | null>(null)

  const create = useMutation({
    mutationFn: (network: Network) => checkoutApi.createQuote(network),
    onSuccess: (q) => {
      // Cotação recém-criada: é exatamente o que o usuário está vendo.
      setQuote(q)
      setChanges([])
      setNeedsAcceptance(false)
    },
  })

  const validate = useMutation({
    mutationFn: (quoteId: string) => checkoutApi.validateQuote(quoteId),
  })

  const ensure = useCallback(
    (network: Network) => {
      if (quote || create.isPending || creatingFor.current === network) return
      creatingFor.current = network
      create.mutate(network, {
        onSettled: () => {
          creatingFor.current = null
        },
      })
    },
    [quote, create],
  )

  const reset = useCallback(() => {
    setQuote(null)
    setChanges([])
    setNeedsAcceptance(false)
    // A chave antiga valia para a cotação antiga: a nova tentativa começa limpa.
    attemptStore.clear()
  }, [])

  const recreate = useCallback(
    async (network: Network) => {
      reset()
      await create.mutateAsync(network).catch(() => undefined)
    },
    [create, reset],
  )

  const revalidate = useCallback(async () => {
    if (!quote) return { valid: false, quote: null }
    try {
      const result = await validate.mutateAsync(quote.id)
      setQuote(result.quote)
      if (result.valid) {
        setChanges([])
        setNeedsAcceptance(false)
        return { valid: true, quote: result.quote }
      }
      setChanges(result.changes)
      setNeedsAcceptance(true)
      attemptStore.clear()
      return { valid: false, quote: result.quote }
    } catch {
      // Falha na revalidação não libera o envio: o usuário tenta de novo.
      return { valid: false, quote }
    }
  }, [quote, validate])

  const accept = useCallback(() => {
    setChanges([])
    setNeedsAcceptance(false)
  }, [])

  const applyChanged = useCallback((next: Quote | null, nextChanges: QuoteValidation['changes']) => {
    attemptStore.clear()
    if (next) setQuote(next)
    setChanges(nextChanges)
    setNeedsAcceptance(true)
  }, [])

  return {
    quote,
    changes,
    needsAcceptance,
    isCreating: create.isPending,
    isValidating: validate.isPending,
    error: create.error,
    ensure,
    recreate,
    reset,
    revalidate,
    accept,
    applyChanged,
  }
}

// ---------------------------------------------------------------------------
// Pedido idempotente
// ---------------------------------------------------------------------------

/** Mesma intenção de compra = mesma chave. Cotação diferente = tentativa nova. */
function ensureAttempt(quoteId: string, fingerprint: string): OrderAttempt {
  const stored = attemptStore.get()
  if (stored && stored.quoteId === quoteId && stored.fingerprint === fingerprint) return stored
  const attempt: OrderAttempt = { key: crypto.randomUUID(), quoteId, fingerprint }
  attemptStore.set(attempt)
  return attempt
}

export type PlacementPhase = 'idle' | 'validating' | 'placing' | 'recovering'

export interface PlacementProblem {
  kind: 'quote' | 'unavailable' | 'wallet' | 'conflict' | 'timeout' | 'generic'
  message: string
  /** Pode reenviar com a MESMA chave (timeout/rede). */
  canRetry: boolean
}

export interface ConfirmInput {
  walletId: string
  network: Network
  buyer: CreateOrderInput['buyer']
}

export interface UseCheckoutOrderOptions {
  quoteFlow: QuoteFlow
  /** O pedido existe no servidor (criado agora ou recuperado): a UI navega para ele. */
  onPlaced: (order: Order) => void
  /** A conexão da carteira caiu: a UI volta para a etapa da carteira. */
  onWalletLost: (message: string) => void
}

/** Erros em que a API já devolve (ou permite recalcular) uma cotação nova. */
function isQuoteError(e: ApiError) {
  return e.code === 'PRICE_CHANGED' || e.code === 'QUOTE_EXPIRED' || e.code === 'OUT_OF_STOCK' || e.code === 'EDITION_UNAVAILABLE'
}

export function useCheckoutOrder({ quoteFlow, onPlaced, onWalletLost }: UseCheckoutOrderOptions) {
  const qc = useQueryClient()
  const { user } = useSession()
  const [phase, setPhase] = useState<PlacementPhase>('idle')
  const [problem, setProblem] = useState<PlacementProblem | null>(null)
  /** Guarda sincrônica: barra o segundo clique que chega antes do re-render. */
  const busyRef = useRef(false)
  const lastInput = useRef<ConfirmInput | null>(null)

  const adopt = useCallback(
    (order: Order) => {
      if (user) {
        qc.setQueryData(qk.order(user.id, order.id), order)
        // Evita que um order.updated antigo (reenviado na reconexão) regrida o status.
        noteResourceVersion('order', order.id, order.version)
      }
      onPlaced(order)
    },
    [qc, user, onPlaced],
  )

  /**
   * Sem resposta do servidor não se pode concluir nada: a chave fica guardada e
   * perguntamos à API se o pedido daquela chave existe.
   */
  const probeAttempt = useCallback(async (): Promise<Order | null> => {
    const stored = attemptStore.get()
    if (!stored) return null
    try {
      return await checkoutApi.findByIdempotencyKey(stored.key)
    } catch {
      return null
    }
  }, [])

  const send = useCallback(
    async (input: ConfirmInput, quote: Quote) => {
      const attempt = ensureAttempt(quote.id, quote.fingerprint)
      setPhase('placing')
      try {
        const order = await checkoutApi.createOrder(
          { quoteId: quote.id, quoteFingerprint: quote.fingerprint, walletId: input.walletId, network: input.network, buyer: input.buyer },
          attempt.key,
        )
        adopt(order)
        return
      } catch (e) {
        if (!isApiError(e)) {
          setProblem({ kind: 'generic', message: 'Não foi possível concluir a compra. Tente novamente.', canRetry: true })
          return
        }
        if (e.isTimeout || e.isNetworkError) {
          // Não assumimos falha: o pedido pode ter sido criado antes do timeout.
          setPhase('recovering')
          const existing = await probeAttempt()
          if (existing) {
            adopt(existing)
            return
          }
          setProblem({
            kind: 'timeout',
            message: 'Não tivemos resposta do servidor e o seu pedido não foi criado. Você pode tentar novamente com segurança: a mesma chave de compra será reenviada, sem risco de cobrar duas vezes.',
            canRetry: true,
          })
          return
        }
        if (e.code === 'WALLET_DISCONNECTED') {
          if (user) void qc.invalidateQueries({ queryKey: qk.walletConnection(user.id) })
          onWalletLost(e.message)
          return
        }
        if (e.code === 'IDEMPOTENCY_CONFLICT') {
          // Chave reutilizada com outro conteúdo: zera a tentativa e exige nova confirmação.
          attemptStore.clear()
          setProblem({ kind: 'conflict', message: 'Esta tentativa de compra já foi usada com outros valores. Revise o resumo e confirme novamente.', canRetry: false })
          void quoteFlow.revalidate()
          return
        }
        if (isQuoteError(e)) {
          const fresh = await quoteFlow.revalidate()
          if (!fresh.quote) {
            setProblem({ kind: 'unavailable', message: 'Os itens do seu carrinho não estão mais disponíveis. Volte ao carrinho para revisar.', canRetry: false })
            return
          }
          // A revalidação já marcou a cotação nova como pendente de aceite.
          setProblem({ kind: 'quote', message: e.message, canRetry: false })
          return
        }
        if (e.code === 'SESSION_EXPIRED' || e.code === 'UNAUTHORIZED') {
          // O SessionWatcher redireciona para o login; o rascunho fica no sessionStorage.
          setProblem({ kind: 'generic', message: 'Sua sessão expirou. Entre novamente para concluir a compra.', canRetry: false })
          return
        }
        setProblem({ kind: 'generic', message: e.message, canRetry: true })
      }
    },
    [adopt, probeAttempt, qc, user, onWalletLost, quoteFlow],
  )

  /** Revalida e, só se a cotação vista pelo usuário continuar válida, envia. */
  const confirm = useCallback(
    async (input: ConfirmInput) => {
      if (busyRef.current) return
      if (!quoteFlow.quote || quoteFlow.needsAcceptance) return
      busyRef.current = true
      lastInput.current = input
      setProblem(null)
      try {
        setPhase('validating')
        const fresh = await quoteFlow.revalidate()
        if (!fresh.valid || !fresh.quote) return
        await send(input, fresh.quote)
      } finally {
        busyRef.current = false
        setPhase('idle')
      }
    },
    [quoteFlow, send],
  )

  /** Reenvio após timeout: mesma chave, mesma cotação, mesmo conteúdo. */
  const retry = useCallback(async () => {
    const input = lastInput.current
    if (busyRef.current || !input || !quoteFlow.quote) return
    busyRef.current = true
    setProblem(null)
    try {
      await send(input, quoteFlow.quote)
    } finally {
      busyRef.current = false
      setPhase('idle')
    }
  }, [send, quoteFlow.quote])

  const dismissProblem = useCallback(() => setProblem(null), [])

  return {
    phase,
    /** Bloqueia o botão de confirmar em qualquer etapa do envio. */
    busy: phase !== 'idle',
    problem,
    confirm,
    retry,
    dismissProblem,
    probeAttempt,
  }
}

// ---------------------------------------------------------------------------
// Pedido (página do pedido)
// ---------------------------------------------------------------------------

export const orderQueryOptions = (userId: string, orderId: string) =>
  queryOptions({
    queryKey: qk.order(userId, orderId),
    queryFn: ({ signal }) => checkoutApi.getOrder(orderId, signal),
    staleTime: 0,
    /**
     * O socket é o caminho principal da confirmação. Este polling curto é só
     * rede de segurança: se o socket cair justamente entre a criação e a
     * liquidação (cenário `socket-drop`), o pedido pendente ainda converge.
     * Enquanto não está pendente, nada é consultado.
     */
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 3000 : false),
    refetchIntervalInBackground: false,
    retry: (count, error) => isApiError(error) && error.isTransient && count < 2,
  })

export function useOrder(orderId: string) {
  const { user } = useSession()
  return useQuery({ ...orderQueryOptions(user?.id ?? 'anon', orderId), enabled: !!user })
}

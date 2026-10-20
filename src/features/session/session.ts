/**
 * Sessão do colecionador.
 *
 * - O token fica em localStorage (`session:token`) para a sessão sobreviver a refresh.
 * - A fonte da verdade do usuário logado é a query `['session']` (GET /auth/session).
 * - Login/cadastro: grava token, faz merge do carrinho de visitante e limpa o
 *   cache privado anterior (troca de usuário não vaza dados).
 * - Logout: encerra no servidor, limpa TODO o cache e o socket reconecta como anônimo.
 * - Expiração (401 SESSION_EXPIRED em qualquer requisição): limpa a sessão e o
 *   app redireciona para o login com `redirect` para retomar o fluxo.
 */
import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { Cart, LoginInput, RegisterInput, Session, SessionInfo } from '@/contracts'
import { getGuestId, isApiError, rotateGuestId, tokenStore } from '@/lib/http'
import { qk } from '@/lib/query-keys'
import { sessionApi } from './api'

type Listener = () => void
const tokenListeners = new Set<Listener>()
export function onTokenChange(fn: Listener) {
  tokenListeners.add(fn)
  return () => tokenListeners.delete(fn)
}
function setToken(token: string | null) {
  tokenStore.set(token)
  for (const fn of tokenListeners) fn()
}

export const sessionQueryOptions = queryOptions({
  queryKey: qk.session,
  queryFn: async (): Promise<SessionInfo | null> => {
    if (!tokenStore.get()) return null
    try {
      return await sessionApi.current()
    } catch (e) {
      if (isApiError(e) && e.status === 401) {
        setToken(null)
        return null
      }
      throw e
    }
  },
  staleTime: 60_000,
  retry: (n, e) => isApiError(e) && e.isTransient && n < 2,
})

export function useSession() {
  const q = useQuery(sessionQueryOptions)
  return { ...q, user: q.data?.user ?? null, isAuthenticated: !!q.data?.user }
}

/** userId para escopo de cache, ou "guest". */
export function useAuthScope(): string {
  const { user } = useSession()
  return user?.id ?? 'guest'
}

/** Remove todos os dados privados e de carrinho do cache. */
export function clearPrivateCache(qc: QueryClient) {
  qc.removeQueries({ queryKey: ['user'] })
  qc.removeQueries({ queryKey: ['cart'] })
}

async function establish(qc: QueryClient, session: Session) {
  const previous = qc.getQueryData<SessionInfo | null>(qk.session)
  if (previous?.user && previous.user.id !== session.user.id) qc.clear()
  clearPrivateCache(qc)
  setToken(session.token)
  // O merge acontece antes de publicar a sessão: enquanto ele está no ar a
  // interface ainda não se considera autenticada, então um reload nessa janela
  // não deixa o carrinho do visitante órfão.
  let merged: Cart | null = null
  try {
    merged = await sessionApi.mergeGuestCart(getGuestId())
    rotateGuestId()
  } catch {
    /* sem rotacionar o id do visitante, o merge é tentado de novo no próximo login */
  }
  qc.setQueryData(sessionQueryOptions.queryKey, { expiresAt: session.expiresAt, user: session.user } as SessionInfo | null)
  if (merged) qc.setQueryData(qk.cart(session.user.id), merged)
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => sessionApi.login(input),
    onSuccess: (session) => establish(qc, session),
  })
}

export function useRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) => sessionApi.register(input),
    onSuccess: (session) => establish(qc, session),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    // A sessão local é encerrada primeiro: se a requisição for interrompida
    // por uma navegação, o usuário não pode continuar autenticado.
    onMutate: () => {
      setToken(null)
      qc.clear()
      qc.setQueryData(qk.session, null)
    },
    mutationFn: async () => {
      try {
        await sessionApi.logout()
      } catch {
        /* mesmo offline, a sessão já foi encerrada no cliente */
      }
    },
  })
}

/** Chamado quando a API responde 401 com token: encerra a sessão local. */
export function handleSessionLost(qc: QueryClient) {
  setToken(null)
  clearPrivateCache(qc)
  qc.setQueryData(qk.session, null)
}

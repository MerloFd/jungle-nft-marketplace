/**
 * Cliente HTTP único da aplicação (Axios). Toda chamada REST passa por aqui.
 *
 * - Injeta `Authorization: Bearer <token>` e `X-Guest-Id` (carrinho de visitante).
 * - Normaliza erros em `ApiError` (código de negócio, status, erros por campo).
 * - Detecta sessão expirada/inválida e avisa a aplicação (sessionEvents).
 * - Valida as respostas com os schemas Zod de `@/contracts`.
 */
import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { ApiErrorBody, type ErrorCode } from '@/contracts'

// ---------------------------------------------------------------------------
// Token de sessão e id de visitante
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'session:token'
const GUEST_KEY = 'cart:guestId'

let memoryToken: string | null = null

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return memoryToken
    }
  },
  set(token: string | null) {
    memoryToken = token
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage indisponível: fica só em memória */
    }
  },
}

let memoryGuest: string | null = null
export function getGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(GUEST_KEY, id)
    }
    return id
  } catch {
    memoryGuest ??= crypto.randomUUID()
    return memoryGuest
  }
}

/** Gera um novo id de visitante (após o merge do carrinho no login). */
export function rotateGuestId() {
  try {
    localStorage.setItem(GUEST_KEY, crypto.randomUUID())
  } catch {
    memoryGuest = crypto.randomUUID()
  }
}

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly fields?: Record<string, string>
  readonly details?: unknown
  /** Falha de transporte: sem resposta (offline, CORS, timeout). */
  readonly isNetworkError: boolean
  readonly isTimeout: boolean

  constructor(init: { status: number; code: ErrorCode; message: string; fields?: Record<string, string>; details?: unknown; isNetworkError?: boolean; isTimeout?: boolean }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.fields = init.fields
    this.details = init.details
    this.isNetworkError = init.isNetworkError ?? false
    this.isTimeout = init.isTimeout ?? false
  }

  /** Vale a pena tentar de novo automaticamente? (rede, timeout, 5xx/503) */
  get isTransient() {
    return this.isNetworkError || this.isTimeout || this.status >= 500 || this.code === 'TRANSIENT'
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

export function isCanceled(e: unknown) {
  return axios.isCancel(e) || (e instanceof AxiosError && e.code === 'ERR_CANCELED')
}

function toApiError(error: AxiosError): ApiError {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError({ status: 0, code: 'TRANSIENT', message: 'O servidor demorou para responder', isTimeout: true })
  }
  if (!error.response) {
    return new ApiError({ status: 0, code: 'TRANSIENT', message: 'Sem conexão com o servidor. Verifique sua internet.', isNetworkError: true })
  }
  const parsed = ApiErrorBody.safeParse(error.response.data)
  if (parsed.success) {
    const { code, message, fields, details } = parsed.data.error
    return new ApiError({ status: error.response.status, code, message, fields, details })
  }
  return new ApiError({ status: error.response.status, code: error.response.status >= 500 ? 'INTERNAL' : 'VALIDATION_ERROR', message: 'Erro inesperado do servidor' })
}

// ---------------------------------------------------------------------------
// Eventos de sessão
// ---------------------------------------------------------------------------

type SessionEvent = { type: 'expired' | 'unauthorized' }
const sessionListeners = new Set<(e: SessionEvent) => void>()
export const sessionEvents = {
  on(fn: (e: SessionEvent) => void) {
    sessionListeners.add(fn)
    return () => {
      sessionListeners.delete(fn)
    }
  },
  emit(e: SessionEvent) {
    for (const fn of sessionListeners) fn(e)
  },
}

// ---------------------------------------------------------------------------
// Instância
// ---------------------------------------------------------------------------

export const http = axios.create({
  baseURL: '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
  paramsSerializer: { indexes: null },
})

http.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set('X-Guest-Id', getGuestId())
  return config
})

http.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (isCanceled(error)) return Promise.reject(error)
    if (!(error instanceof AxiosError)) return Promise.reject(error)
    const apiError = toApiError(error)
    const sentToken = !!error.config?.headers?.Authorization
    if (sentToken && apiError.status === 401 && (apiError.code === 'SESSION_EXPIRED' || apiError.code === 'UNAUTHORIZED')) {
      sessionEvents.emit({ type: apiError.code === 'SESSION_EXPIRED' ? 'expired' : 'unauthorized' })
    }
    return Promise.reject(apiError)
  },
)

/** Requisição tipada e validada pelo schema do contrato. */
export async function request<S extends z.ZodTypeAny>(schema: S, config: AxiosRequestConfig): Promise<z.infer<S>> {
  const res = await http.request(config)
  return schema.parse(res.data)
}

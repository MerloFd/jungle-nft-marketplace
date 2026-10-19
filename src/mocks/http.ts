import { HttpResponse, delay } from 'msw'
import type { ErrorCode } from '@/contracts'
import { db, persist, SHORT_SESSION_TTL_MS } from './db'
import { getLatencyFactor, getScenario, nextLatency } from './scenarios'

export const API = '/api'

export function json<T>(body: T, status = 200) {
  return HttpResponse.json(body as never, { status })
}

export function apiError(status: number, code: ErrorCode, message: string, extra: { fields?: Record<string, string>; details?: unknown } = {}) {
  return HttpResponse.json({ error: { code, message, ...extra } }, { status })
}

export const notFound = (what = 'Recurso') => apiError(404, 'NOT_FOUND', `${what} não encontrado`)

/**
 * Aplica condições de rede do cenário: latência (determinística) e falta de
 * conexão. Retorna uma Response quando a requisição deve falhar aqui.
 */
export async function network(): Promise<Response | null> {
  const scenario = getScenario()
  const ms = nextLatency() * getLatencyFactor()
  if (ms > 0) await delay(ms)
  if (scenario.offline) return HttpResponse.error() as unknown as Response
  return null
}

export function bearer(request: Request): string | null {
  const h = request.headers.get('authorization')
  if (!h?.startsWith('Bearer ')) return null
  return h.slice(7)
}

/**
 * Exige sessão válida. Retorna o userId ou a Response de erro
 * (401 UNAUTHORIZED sem token / token desconhecido, 401 SESSION_EXPIRED se expirou).
 */
export function requireUser(request: Request): string | Response {
  const token = bearer(request)
  if (!token) return apiError(401, 'UNAUTHORIZED', 'Faça login para continuar')
  const s = db()
  const session = s.sessions.find((x) => x.token === token)
  if (!session) return apiError(401, 'UNAUTHORIZED', 'Sessão inválida')
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    s.sessions = s.sessions.filter((x) => x.token !== token)
    persist()
    return apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  }
  return session.userId
}

/** Usuário opcional: null se anônimo; Response se o token enviado é inválido/expirado. */
export function optionalUser(request: Request): string | null | Response {
  if (!bearer(request)) return null
  return requireUser(request)
}

/** Dono do carrinho: usuário autenticado ou visitante (header X-Guest-Id). */
export function cartOwner(request: Request): string | Response {
  const user = optionalUser(request)
  if (user instanceof Response) return user
  if (user) return `user:${user}`
  const guest = request.headers.get('x-guest-id')
  if (!guest || !/^[a-zA-Z0-9-]{8,64}$/.test(guest)) return apiError(400, 'VALIDATION_ERROR', 'Identificador de visitante ausente')
  return `guest:${guest}`
}

export function sessionTtl() {
  return getScenario().sessionExpiresSoon ? SHORT_SESSION_TTL_MS : 30 * 60 * 1000
}

export async function readJson<T = unknown>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

/** Converte issues do Zod em `fields` para o formato de erro da API. */
export function zodFields(issues: { path: PropertyKey[]; message: string }[]) {
  const fields: Record<string, string> = {}
  for (const i of issues) {
    const k = i.path.map(String).join('.') || '_'
    if (!fields[k]) fields[k] = i.message
  }
  return fields
}

export const validationError = (issues: { path: PropertyKey[]; message: string }[]) =>
  apiError(422, 'VALIDATION_ERROR', 'Verifique os campos destacados', { fields: zodFields(issues) })

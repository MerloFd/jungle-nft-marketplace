import { http, HttpResponse } from 'msw'
import { LoginInput, RegisterInput, type Session } from '@/contracts'
import { db, findUser, findUserByEmail, hashPassword, persist, publicUser, randomToken, nowIso, type DbUser } from '../db'
import { API, apiError, bearer, json, network, readJson, requireUser, sessionTtl, validationError } from '../http'
import { dropUserConnections } from '../realtime'

function createSession(user: DbUser): Session {
  const token = randomToken('sess')
  const expiresAt = new Date(Date.now() + sessionTtl()).toISOString()
  db().sessions.push({ token, userId: user.id, expiresAt })
  persist()
  return { token, expiresAt, user: publicUser(user) }
}

export const authHandlers = [
  http.post(`${API}/auth/register`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const parsed = RegisterInput.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error.issues)
    const input = parsed.data
    const s = db()
    if (findUserByEmail(input.email)) {
      return apiError(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail', { fields: { email: 'Este e-mail já está cadastrado' } })
    }
    if (s.users.some((u) => u.username === input.username)) {
      return apiError(409, 'CONFLICT', 'Nome de usuário indisponível', { fields: { username: 'Este nome de usuário já está em uso' } })
    }
    const id = `usr_${input.username}`
    const passwordSalt = randomToken('salt')
    const user: DbUser = {
      id,
      name: input.name,
      username: input.username,
      email: input.email,
      bio: '',
      avatarUrl: '/avatars/creator-01.svg',
      createdAt: nowIso(),
      passwordSalt,
      passwordHash: await hashPassword(input.password, passwordSalt),
    }
    s.users.push(user)
    s.favorites[id] = []
    return json(createSession(user), 201)
  }),

  http.post(`${API}/auth/login`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const parsed = LoginInput.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error.issues)
    const user = findUserByEmail(parsed.data.email)
    const ok = user && (await hashPassword(parsed.data.password, user.passwordSalt)) === user.passwordHash
    if (!user || !ok) return apiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos')
    return json(createSession(user))
  }),

  http.get(`${API}/auth/session`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const token = bearer(request)!
    const session = db().sessions.find((x) => x.token === token)!
    return json({ expiresAt: session.expiresAt, user: publicUser(findUser(userId)!) })
  }),

  http.post(`${API}/auth/logout`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const token = bearer(request)
    if (token) {
      const s = db()
      const session = s.sessions.find((x) => x.token === token)
      s.sessions = s.sessions.filter((x) => x.token !== token)
      persist()
      if (session) dropUserConnections(session.userId)
    }
    return new HttpResponse(null, { status: 204 })
  }),
]

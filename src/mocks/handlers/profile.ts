import { http } from 'msw'
import { AvatarUpdateInput, PasswordChangeInput, ProfileUpdateInput } from '@/contracts'
import { db, findUser, hashPassword, persist, publicUser, randomToken } from '../db'
import { API, apiError, bearer, json, network, readJson, requireUser, validationError } from '../http'

const MAX_AVATAR_CHARS = 1_400_000 // ~1MB em base64

export const profileHandlers = [
  http.get(`${API}/profile`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    return json(publicUser(findUser(userId)!))
  }),

  http.patch(`${API}/profile`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const parsed = ProfileUpdateInput.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error.issues)
    const s = db()
    const input = parsed.data
    if (s.users.some((u) => u.id !== userId && u.email.toLowerCase() === input.email.toLowerCase())) {
      return apiError(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso', { fields: { email: 'Este e-mail já está em uso' } })
    }
    if (s.users.some((u) => u.id !== userId && u.username === input.username)) {
      return apiError(409, 'CONFLICT', 'Nome de usuário indisponível', { fields: { username: 'Este nome de usuário já está em uso' } })
    }
    const user = findUser(userId)!
    Object.assign(user, input)
    persist()
    return json(publicUser(user))
  }),

  http.post(`${API}/profile/avatar`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const parsed = AvatarUpdateInput.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error.issues)
    if (parsed.data.dataUrl.length > MAX_AVATAR_CHARS) {
      return apiError(422, 'VALIDATION_ERROR', 'Imagem muito grande', { fields: { dataUrl: 'A imagem deve ter no máximo 1MB' } })
    }
    const user = findUser(userId)!
    user.avatarUrl = parsed.data.dataUrl
    persist()
    return json(publicUser(user))
  }),

  http.post(`${API}/profile/password`, async ({ request }) => {
    const fail = await network()
    if (fail) return fail
    const userId = requireUser(request)
    if (userId instanceof Response) return userId
    const parsed = PasswordChangeInput.safeParse(await readJson(request))
    if (!parsed.success) return validationError(parsed.error.issues)
    const user = findUser(userId)!
    const ok = (await hashPassword(parsed.data.currentPassword, user.passwordSalt)) === user.passwordHash
    if (!ok) return apiError(422, 'VALIDATION_ERROR', 'Senha atual incorreta', { fields: { currentPassword: 'Senha atual incorreta' } })
    if (parsed.data.currentPassword === parsed.data.newPassword) {
      return apiError(422, 'VALIDATION_ERROR', 'A nova senha deve ser diferente da atual', { fields: { newPassword: 'Use uma senha diferente da atual' } })
    }
    user.passwordSalt = randomToken('salt')
    user.passwordHash = await hashPassword(parsed.data.newPassword, user.passwordSalt)
    // Mantém a sessão atual e encerra as demais.
    const token = bearer(request)
    db().sessions = db().sessions.filter((x) => x.userId !== userId || x.token === token)
    persist()
    return json({ ok: true })
  }),
]

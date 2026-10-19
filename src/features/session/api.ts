import { type z } from 'zod'
import { Cart, Session, SessionInfo, type LoginInput, type RegisterInput } from '@/contracts'
import { http, request } from '@/lib/http'

export const sessionApi = {
  login: (input: LoginInput) => request(Session, { method: 'POST', url: '/auth/login', data: input }),
  register: (input: RegisterInput) => request(Session, { method: 'POST', url: '/auth/register', data: input }),
  current: () => request(SessionInfo, { method: 'GET', url: '/auth/session' }),
  logout: () => http.post('/auth/logout').then(() => undefined),
  mergeGuestCart: (guestId: string) => request(Cart, { method: 'POST', url: '/cart/merge', data: { guestId } }),
}

export const NullableSessionInfo = SessionInfo.nullable()
export type NullableSessionInfo = z.infer<typeof NullableSessionInfo>

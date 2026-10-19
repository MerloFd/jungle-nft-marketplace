import { z } from 'zod'
import {
  User,
  Wallet,
  WalletsResponse,
  type AvatarUpdateInput,
  type PasswordChangeInput,
  type ProfileUpdateInput,
  type WalletInput,
} from '@/contracts'
import { request } from '@/lib/http'

const Ok = z.object({ ok: z.literal(true) })

export const accountApi = {
  getProfile: (signal?: AbortSignal) => request(User, { method: 'GET', url: '/profile', signal }),
  updateProfile: (input: ProfileUpdateInput) => request(User, { method: 'PATCH', url: '/profile', data: input }),
  updateAvatar: (input: AvatarUpdateInput) => request(User, { method: 'POST', url: '/profile/avatar', data: input }),
  changePassword: (input: PasswordChangeInput) => request(Ok, { method: 'POST', url: '/profile/password', data: input }),
  listWallets: (signal?: AbortSignal) => request(WalletsResponse, { method: 'GET', url: '/wallets', signal }),
  createWallet: (input: WalletInput) => request(Wallet, { method: 'POST', url: '/wallets', data: input }),
  updateWallet: (id: string, input: WalletInput) => request(Wallet, { method: 'PATCH', url: `/wallets/${id}`, data: input }),
}

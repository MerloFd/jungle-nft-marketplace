/**
 * Estado remoto da conta: perfil e carteiras. Chaves sempre com userId
 * (isolamento entre usuários). Após atualizar o perfil, a query de sessão
 * também é atualizada para o cabeçalho refletir nome e avatar.
 */
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AvatarUpdateInput, PasswordChangeInput, ProfileUpdateInput, SessionInfo, User, Wallet, WalletInput } from '@/contracts'
import { qk } from '@/lib/query-keys'
import { sessionQueryOptions, useSession } from '@/features/session/session'
import { accountApi } from './api'

export const profileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: qk.profile(userId),
    queryFn: ({ signal }) => accountApi.getProfile(signal),
    staleTime: 0,
  })

export const walletsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: qk.wallets(userId),
    queryFn: ({ signal }) => accountApi.listWallets(signal).then((r) => r.items),
    staleTime: 0,
  })

export function useProfile() {
  const { user } = useSession()
  return useQuery({ ...profileQueryOptions(user?.id ?? 'anon'), enabled: !!user })
}

/** Carteiras do usuário autenticado (principal primeiro). Reutilizável no checkout. */
export function useWallets() {
  const { user } = useSession()
  return useQuery({ ...walletsQueryOptions(user?.id ?? 'anon'), enabled: !!user })
}

function useApplyUser() {
  const qc = useQueryClient()
  return (user: User) => {
    qc.setQueryData(qk.profile(user.id), user)
    qc.setQueryData(sessionQueryOptions.queryKey, (old: SessionInfo | null | undefined) => (old ? { ...old, user } : old))
  }
}

export function useUpdateProfile() {
  const apply = useApplyUser()
  return useMutation({ mutationFn: (input: ProfileUpdateInput) => accountApi.updateProfile(input), onSuccess: apply })
}

export function useUpdateAvatar() {
  const apply = useApplyUser()
  return useMutation({ mutationFn: (input: AvatarUpdateInput) => accountApi.updateAvatar(input), onSuccess: apply })
}

export function useChangePassword() {
  return useMutation({ mutationFn: (input: PasswordChangeInput) => accountApi.changePassword(input) })
}

export function useSaveWallet() {
  const qc = useQueryClient()
  const { user } = useSession()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: WalletInput }) => (id ? accountApi.updateWallet(id, input) : accountApi.createWallet(input)),
    onSuccess: (wallet) => {
      if (!user) return
      qc.setQueryData<Wallet[]>(qk.wallets(user.id), (old) => {
        const list = old ? old.filter((w) => w.id !== wallet.id) : []
        return [...list, wallet].sort((a, b) => (a.role === 'primary' ? -1 : 1) - (b.role === 'primary' ? -1 : 1))
      })
      // Conexão de carteira pode ter mudado (redes editadas).
      void qc.invalidateQueries({ queryKey: qk.walletConnection(user.id) })
    },
  })
}

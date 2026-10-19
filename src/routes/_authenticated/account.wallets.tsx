import { createFileRoute } from '@tanstack/react-router'
import { WalletsPage } from '@/features/account/pages/WalletsPage'

export const Route = createFileRoute('/_authenticated/account/wallets')({
  component: WalletsPage,
})

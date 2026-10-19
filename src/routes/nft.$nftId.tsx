import { createFileRoute } from '@tanstack/react-router'
import { NftDetailPage } from '@/features/catalog/pages/NftDetailPage'

export const Route = createFileRoute('/nft/$nftId')({
  component: NftDetailPage,
})

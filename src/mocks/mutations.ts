/**
 * Mutações de catálogo que precisam refletir em REST e Socket.IO ao mesmo tempo.
 */
import { findNft, persist, recomputeNftAggregates } from './db'
import { publishNftUpdated } from './realtime'

export function updateEdition(nftId: string, editionId: string, patch: { priceEth?: string; available?: number; delta?: number }) {
  const nft = findNft(nftId)
  const ed = nft?.editions.find((e) => e.id === editionId)
  if (!nft || !ed) throw new Error(`Edição inexistente: ${nftId}/${editionId}`)
  if (patch.priceEth !== undefined) ed.priceEth = patch.priceEth
  if (patch.available !== undefined) ed.available = Math.max(0, Math.min(ed.supply, patch.available))
  if (patch.delta !== undefined) ed.available = Math.max(0, Math.min(ed.supply, ed.available + patch.delta))
  nft.version += 1
  recomputeNftAggregates(nft)
  persist()
  return publishNftUpdated(nft)
}

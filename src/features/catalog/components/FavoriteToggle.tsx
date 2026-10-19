import { useLocation, useNavigate } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAnnounce } from '@/components/ui/live-region'
import { toast } from '@/components/ui/toaster'
import { useSession } from '@/features/session/session'
import { useFavorites, useToggleFavorite } from '../hooks'

export interface FavoriteToggleProps {
  nftId: string
  nftName: string
  favoritesCount: number
}

/**
 * Favorito com atualização otimista: o coração muda na hora e volta ao estado
 * anterior se a API recusar (cenário `favorites-error`). Sem sessão, leva ao
 * login preservando o destino em `redirect`.
 */
export function FavoriteToggle({ nftId, nftName, favoritesCount }: FavoriteToggleProps) {
  const { isAuthenticated } = useSession()
  const { nftIds } = useFavorites()
  const toggle = useToggleFavorite()
  const announce = useAnnounce()
  const navigate = useNavigate()
  const location = useLocation()

  const isFavorite = nftIds.includes(nftId)

  const onClick = () => {
    if (!isAuthenticated) {
      void navigate({ to: '/login', search: { redirect: location.href } })
      return
    }
    const next = !isFavorite
    toggle.mutate(
      { nftId, next },
      {
        onSuccess: () => {
          announce(next ? `${nftName} adicionado aos favoritos` : `${nftName} removido dos favoritos`)
        },
        onError: () => {
          const message = next ? 'Não foi possível favoritar este NFT. Tente novamente.' : 'Não foi possível remover o favorito. Tente novamente.'
          toast.error(message)
          announce(message, 'assertive')
        },
      },
    )
  }

  return (
    <Button
      variant="outline"
      data-testid="favorite-toggle"
      aria-pressed={isAuthenticated ? isFavorite : false}
      onClick={onClick}
    >
      <Heart aria-hidden="true" className={isFavorite ? 'fill-current text-accent-text' : undefined} />
      {isFavorite ? 'Nos favoritos' : 'Favoritar'}
      <span className="text-muted-foreground">({favoritesCount})</span>
    </Button>
  )
}

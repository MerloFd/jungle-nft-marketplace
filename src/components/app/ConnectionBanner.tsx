import { WifiOff } from 'lucide-react'
import { useConnectionStatus } from '@/realtime/RealtimeProvider'

/** Aviso discreto quando a conexão em tempo real caiu e está reconectando. */
export function ConnectionBanner() {
  const status = useConnectionStatus()
  if (status !== 'reconnecting') return null
  return (
    <div role="status" data-testid="connection-banner" className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-sm font-semibold text-background">
      <WifiOff aria-hidden="true" className="size-4" />
      Conexão em tempo real interrompida. Reconectando...
    </div>
  )
}

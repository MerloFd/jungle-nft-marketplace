/** Retomada do fluxo após autenticar (`?redirect=` validado em search.ts). */
import { useRouter } from '@tanstack/react-router'

export function useAfterAuthRedirect() {
  const router = useRouter()
  /**
   * `redirect` é um href interno arbitrário (ex.: "/checkout?step=2"), já validado
   * pelo `authSearchSchema`. O `to` do router só aceita rotas conhecidas em tempo
   * de tipo, então navegamos pelo href pronto.
   */
  return (redirect: string | undefined) => {
    void router.navigate({ href: redirect ?? '/', replace: true })
  }
}

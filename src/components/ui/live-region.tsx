import * as React from 'react'

export type Politeness = 'polite' | 'assertive'
export type Announce = (message: string, politeness?: Politeness) => void

const AnnounceContext = React.createContext<Announce>(() => {})

/**
 * Regiões aria-live para anunciar mutations e alterações em tempo real
 * (ex.: "Preço de X mudou para 0.5 ETH"). Monte uma vez perto da raiz.
 */
export function LiveRegionProvider({ children }: { children: React.ReactNode }) {
  const [polite, setPolite] = React.useState('')
  const [assertive, setAssertive] = React.useState('')
  const timers = React.useRef<number[]>([])

  const announce = React.useCallback<Announce>((message, politeness = 'polite') => {
    const set = politeness === 'assertive' ? setAssertive : setPolite
    // Limpa e reescreve para que mensagens repetidas também sejam anunciadas.
    set('')
    const t = window.setTimeout(() => set(message), 60)
    timers.current.push(t)
  }, [])

  React.useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((t) => window.clearTimeout(t))
  }, [])

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true" role="status" data-testid="live-region-polite">
        {polite}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true" role="alert" data-testid="live-region-assertive">
        {assertive}
      </div>
    </AnnounceContext.Provider>
  )
}

export function useAnnounce(): Announce {
  return React.useContext(AnnounceContext)
}

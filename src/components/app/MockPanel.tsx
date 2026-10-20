import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from '@/components/ui/toaster'
import { eth } from '@/lib/money'

/**
 * Painel da camada de mocks (só aparece quando os mocks estão ativos).
 * Permite trocar o cenário, restaurar os dados e disparar eventos pelo
 * servidor simulado (que emite via Socket.IO, nunca direto na UI).
 */
export function MockPanel() {
  const mock = typeof window !== 'undefined' ? window.__mock : undefined
  const [scenario, setScenario] = useState(() => mock?.getScenario() ?? 'default')
  if (!mock) return null

  const apply = (name: string) => {
    setScenario(name as typeof scenario)
    mock.setScenario(name as Parameters<typeof mock.setScenario>[0])
    const url = new URL(window.location.href)
    url.searchParams.delete('scenario')
    window.location.assign(url.toString())
  }

  const bumpPrice = () => {
    const nft = mock.getNft('nft-01')
    const ed = nft?.editions[0]
    if (!nft || !ed) return
    mock.updateEdition(nft.id, ed.id, { priceEth: eth.add(ed.priceEth, eth.percent(ed.priceEth, 10)) })
    toast.message(`Servidor simulado: preço de ${nft.name} (${ed.name}) subiu 10%`)
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="fixed bottom-4 left-4 z-40 shadow-lg" data-testid="mock-panel-trigger">
          <FlaskConical aria-hidden="true" className="size-4" />
          Cenários
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Camada de mocks</SheetTitle>
          <SheetDescription>API e tempo real simulados com MSW. O cenário fica salvo e pode ser definido pela URL com ?scenario=nome.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 p-4">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 font-semibold">Cenário</legend>
            <RadioGroup value={scenario} onValueChange={apply}>
              {mock.scenarios.map((s) => (
                <div key={s.name} className="flex items-start gap-3">
                  <RadioGroupItem id={`sc-${s.name}`} value={s.name} className="mt-1" />
                  <Label htmlFor={`sc-${s.name}`} className="flex flex-col items-start gap-0.5 font-normal">
                    <span className="font-mono text-sm font-semibold">{s.name}</span>
                    <span className="text-sm text-muted-foreground">{s.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="flex flex-col gap-2">
            <p className="font-semibold">Ações do servidor simulado</p>
            <Button variant="outline" className="h-auto whitespace-normal py-2.5 text-left" onClick={bumpPrice}>
              Subir preço do NFT "Aurora Digital"
            </Button>
            <Button variant="outline" className="h-auto whitespace-normal py-2.5 text-left" onClick={() => mock.dropSockets()}>
              Derrubar conexão em tempo real
            </Button>
            <Button variant="outline" className="h-auto whitespace-normal py-2.5 text-left" onClick={() => mock.expireSessions()}>
              Expirar sessão
            </Button>
            <Button
              variant="destructive"
              className="h-auto whitespace-normal py-2.5 text-left"
              onClick={async () => {
                await mock.reset()
                try {
                  localStorage.clear()
                  sessionStorage.clear()
                } catch {
                  /* storage bloqueado */
                }
                window.location.assign('/')
              }}
            >
              Restaurar dados iniciais
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

import * as React from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

export interface AuthModalProps {
  mode: 'login' | 'register'
  redirect?: string
  subtitle: string
  children: React.ReactNode
}

const tabClass = (active: boolean) =>
  cn(
    'text-xl font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    active ? 'text-primary' : 'text-foreground hover:text-accent-text',
  )

/**
 * Moldura comum de login e cadastro: modal sobre a página (não uma rota em
 * branco), com abas reais (navegam entre /login e /register, preservando o
 * `redirect`) e os blocos que o Figma mostra mas o contrato não sustenta —
 * "Esqueceu a senha?" e os provedores sociais não têm rota no backend
 * simulado, então ficam aria-disabled em vez de fingir que funcionam.
 */
export function AuthModal({ mode, redirect, subtitle, children }: AuthModalProps) {
  const router = useRouter()

  const close = React.useCallback(() => {
    if (window.history.length > 1) router.history.back()
    else void router.navigate({ to: '/' })
  }, [router])

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-md gap-0 border-b-4 border-b-primary p-6 sm:p-8">
        <DialogTitle className="sr-only">{mode === 'login' ? 'Entrar' : 'Criar conta'}</DialogTitle>

        <div className="mb-2 flex items-center justify-center gap-3">
          <Link to="/login" search={{ redirect }} className={tabClass(mode === 'login')}>
            Entrar
          </Link>
          <span aria-hidden="true" className="text-border-strong">
            |
          </span>
          <Link to="/register" search={{ redirect }} className={tabClass(mode === 'register')}>
            Criar conta
          </Link>
        </div>

        <DialogDescription className="mb-6 text-center">{subtitle}</DialogDescription>

        {children}

        <div className="my-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">Ou continue com</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col gap-3">
          <SocialButton letter="G" label="Google" />
          <SocialButton letter="f" label="Facebook" />
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Login social não existe no backend simulado (sem OAuth no contrato): o
 * botão compõe a tela, fiel ao Figma, mas não aparenta funcionar — clicar
 * não faz nada, sem "login" fictício sem resposta real da simulação.
 */
function SocialButton({ letter, label }: { letter: string; label: string }) {
  return (
    <span
      aria-disabled="true"
      className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-input text-sm font-medium text-muted-foreground"
    >
      <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-foreground">
        {letter}
      </span>
      Continuar com {label}
      <span className="sr-only"> (indisponível nesta demonstração)</span>
    </span>
  )
}

import * as React from 'react'
import { PageContainer } from '@/components/layout/PageContainer'

export interface AuthLayoutProps {
  title: string
  description?: React.ReactNode
  /** Avisos acima do formulário (ex.: sessão expirada). */
  notice?: React.ReactNode
  /** Rodapé do cartão (link para a outra tela de autenticação). */
  footer?: React.ReactNode
  children: React.ReactNode
}

/** Moldura das telas de autenticação: coluna única, largura legível em 390px. */
export function AuthLayout({ title, description, notice, footer, children }: AuthLayoutProps) {
  return (
    <PageContainer as="section" className="py-10 md:py-16">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
        {notice ? <div className="mt-6">{notice}</div> : null}
        <div className="mt-8 rounded-xl bg-card p-6 text-card-foreground md:p-8">{children}</div>
        {footer ? <div className="mt-6 text-center text-muted-foreground">{footer}</div> : null}
      </div>
    </PageContainer>
  )
}

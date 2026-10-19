import { PageContainer } from './PageContainer'

const externalLinks = [
  { href: 'https://github.com/junglegaming/frontend-challenge', label: 'Enunciado do desafio' },
  { href: 'https://ethereum.org/pt-br/nft/', label: 'O que são NFTs' },
]

const internalLinks = [
  { href: '/', label: 'Início' },
  { href: '/#catalogo', label: 'Mercado' },
  { href: '/cart', label: 'Carrinho' },
]

const linkClass =
  'inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export function AppFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-24">
      <PageContainer>
        <div aria-hidden="true" className="h-px bg-primary/40" />
        <div className="flex flex-col gap-10 py-12 md:flex-row md:justify-between md:gap-16">
          <div className="flex max-w-[360px] flex-col gap-4">
            <p className="text-xl font-bold uppercase tracking-[0.2em]">Kurio</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Mercado de NFTs de artistas independentes. Projeto de demonstração: pagamentos, carteiras e blockchain
              são simulados.
            </p>
          </div>

          <div className="flex flex-col gap-10 sm:flex-row sm:gap-16">
            <nav aria-label="Navegação do rodapé">
              <h2 className="mb-2 text-base font-bold uppercase tracking-[0.1em]">Mercado</h2>
              <ul className="flex flex-col">
                {internalLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className={linkClass}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Links externos">
              <h2 className="mb-2 text-base font-bold uppercase tracking-[0.1em]">Aprenda</h2>
              <ul className="flex flex-col">
                {externalLinks.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {link.label}
                      <span className="sr-only"> (abre em nova aba)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="border-t border-border py-6">
          <p className="text-sm text-muted-foreground">© {year} Kurio. Dados fictícios.</p>
        </div>
      </PageContainer>
    </footer>
  )
}

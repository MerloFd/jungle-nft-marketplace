import { Store } from 'lucide-react'
import { PageContainer } from './PageContainer'

const externalLinks = [
  { href: 'https://github.com/junglegaming/frontend-challenge', label: 'Enunciado do desafio' },
  { href: 'https://ethereum.org/pt-br/nft/', label: 'O que são NFTs' },
]

export function AppFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <PageContainer className="flex flex-col gap-8 py-10 md:flex-row md:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <p className="inline-flex items-center gap-3">
            <Store aria-hidden="true" className="size-7 text-brand" />
            <span className="font-mono text-lg font-bold">NFT Marketplace</span>
          </p>
          <p className="text-muted-foreground">
            Projeto de demonstração. Pagamentos, carteiras e blockchain são simulados.
          </p>
        </div>
        <nav aria-label="Links externos">
          <h2 className="mb-3 font-mono text-lg font-bold">Explore</h2>
          <ul className="flex flex-col gap-2">
            {externalLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {link.label}
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </PageContainer>
      <PageContainer className="border-t border-border py-6">
        <p className="text-sm text-muted-foreground">© {year} NFT Marketplace. Dados fictícios.</p>
      </PageContainer>
    </footer>
  )
}

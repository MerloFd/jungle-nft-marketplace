import { Globe, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageContainer } from './PageContainer'

/**
 * Rodapé fiel ao Figma (faixa de informação, newsletter, barra de contato e
 * 4 colunas). Nem todo item do Figma tem uma tela real nesta entrega (seção
 * 3: páginas editoriais/suporte/atividade ficam fora do escopo), então cada
 * link é real quando existe uma tela por trás, e aria-disabled quando não
 * existe — nenhum deles aparenta funcionar sem funcionar de verdade.
 */

const infoBand = [
  { icon: ShieldCheck, letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { icon: Sparkles, letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { icon: Zap, letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const perfilLinks: { label: string; href: string | null }[] = [
  { label: 'Meu perfil', href: '/account/profile' },
  { label: 'Minha coleção', href: null },
  { label: 'Atividade', href: null },
  { label: 'Estúdio do criador', href: null },
  { label: 'Lista de interesse', href: null },
]

const ajudaLinks: { label: string; href: string | null }[] = [
  { label: 'Central de ajuda', href: null },
  { label: 'Como comprar NFTs', href: null },
  { label: 'Carteira e segurança', href: '/account/wallets' },
  { label: 'Política do mercado', href: null },
  { label: 'Denunciar item', href: null },
]

const colecaoLinks: { label: string; category: string | null }[] = [
  { label: 'Arte digital', category: 'art' },
  { label: 'Fotografia', category: 'photography' },
  { label: 'Música', category: 'music' },
  { label: 'Arte 3D', category: null },
  { label: 'Utilidade', category: 'utility' },
]

const socialNetworks = ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube']

const walletBadges = ['MetaMask', 'WalletConnect', 'Coinbase']

const linkClass =
  'inline-flex min-h-9 items-center text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
const disabledLinkClass = 'inline-flex min-h-9 items-center text-sm text-muted-foreground/50 cursor-not-allowed'

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title}>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em]">{title}</h2>
      <ul className="flex flex-col">{children}</ul>
    </nav>
  )
}

function categoryHref(category: string) {
  return '/?category=' + encodeURIComponent(JSON.stringify([category])) + '#catalogo'
}

export function AppFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-24 border-t border-border bg-card/40">
      <PageContainer className="flex flex-col gap-10 py-12">
        <div className="grid gap-8 rounded-xl bg-card p-6 sm:grid-cols-2 lg:grid-cols-4 lg:items-start">
          {infoBand.map(({ icon: Icon, letter, title, text }) => (
            <div key={title} className="flex flex-col gap-3">
              <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                <Icon className="size-5" />
                <span className="sr-only">{letter}</span>
              </span>
              <h3 className="text-base font-bold">{title}</h3>
              <p className="text-sm leading-5 text-muted-foreground">{text}</p>
            </div>
          ))}

          {/* aria-hidden: campo sem função real (ver docs/ESPECIFICACOES.md), fora da árvore de
              acessibilidade para não colidir com o rótulo "E-mail" de formulários de verdade
              em toda a aplicação (o rodapé é global). */}
          <form aria-hidden="true" className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
            <h3 className="text-base font-bold">Antecipe-se ao próximo lançamento</h3>
            <div className="flex gap-2">
              {/* Sem <label>: o formulário já é aria-hidden (não existe de fato), e um
                  rótulo "E-mail" aqui colidiria com getByLabel(/e-?mail/i) de
                  QUALQUER formulário real da aplicação, já que o rodapé é global. */}
              <input
                id="newsletter-email"
                type="email"
                disabled
                placeholder="digite seu e-mail…"
                className="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span
                aria-disabled="true"
                className="flex h-10 shrink-0 cursor-not-allowed items-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground opacity-60"
              >
                Enviar
              </span>
            </div>
            <p id="newsletter-hint" className="text-xs text-muted-foreground">
              Lista de transmissão não está disponível nesta demonstração.
            </p>
          </form>
        </div>

        <div className="flex flex-col gap-3 border-y border-border py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base font-bold uppercase tracking-[0.2em] text-foreground">Kurio</p>
          <p>Feito para colecionadores, criadores e cultura.</p>
          <p>contato@exemplo.test · dados fictícios</p>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <FooterColumn title="Meu perfil">
            {perfilLinks.map((l) => (
              <li key={l.label}>
                {l.href ? (
                  <a href={l.href} className={linkClass}>
                    {l.label}
                  </a>
                ) : (
                  <span aria-disabled="true" className={disabledLinkClass}>
                    {l.label}
                  </span>
                )}
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Central de ajuda">
            {ajudaLinks.map((l) => (
              <li key={l.label}>
                {l.href ? (
                  <a href={l.href} className={linkClass}>
                    {l.label}
                  </a>
                ) : (
                  <span aria-disabled="true" className={disabledLinkClass}>
                    {l.label}
                  </span>
                )}
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Coleções">
            {colecaoLinks.map((l) => (
              <li key={l.label}>
                {l.category ? (
                  <a href={categoryHref(l.category)} className={linkClass}>
                    {l.label}
                  </a>
                ) : (
                  <span aria-disabled="true" className={disabledLinkClass}>
                    {l.label}
                  </span>
                )}
              </li>
            ))}
          </FooterColumn>

          <div className="flex flex-col gap-8">
            <nav aria-label="Redes sociais">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em]">Redes sociais</h2>
              <ul className="flex flex-wrap gap-2">
                {socialNetworks.map((label) => (
                  <li key={label}>
                    <span aria-disabled="true" className="flex size-9 cursor-not-allowed items-center justify-center rounded-full bg-accent text-muted-foreground">
                      <Globe aria-hidden="true" className="size-4" />
                      <span className="sr-only">{label} (indisponível nesta demonstração)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.1em]">Carteiras compatíveis</h2>
              <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
                {walletBadges.map((w, i) => (
                  <span key={w} className={cn(i > 0 && 'before:mr-2 before:content-["·"]')}>
                    {w}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          © {year} Kurio. Propriedade digital para todos. Dados fictícios.
        </p>
      </PageContainer>
    </footer>
  )
}

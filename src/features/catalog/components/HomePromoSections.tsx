import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Duas seções do Figma (camadas "Promos" e "Blog") que ficam entre a
 * paginação e o rodapé. São editoriais — fora do escopo de telas do desafio
 * (seção 3: "páginas editoriais ... não fazem parte da entrega") — então as
 * ações ficam aria-disabled: compõem o layout sem aparentar um fluxo real.
 */

interface PromoCard {
  image: string
  alt: string
  title: string
  description: string
}

const PROMOS: PromoCard[] = [
  {
    image: '/kurio/promo-1.png',
    alt: 'Ilustração de um personagem com óculos escuros e jaqueta verde',
    title: 'Lançamentos gênese de edição limitada',
    description: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
  },
  {
    image: '/kurio/promo-2.png',
    alt: 'Ilustração de um personagem com jaqueta bege',
    title: 'Arte digital selecionada e muito mais',
    description: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cena.',
  },
]

interface BlogCard {
  image: string
  alt: string
  date: string
  readTime: string
  title: string
  excerpt: string
}

const ARTICLES: BlogCard[] = [
  {
    image: '/kurio/blog-1.png',
    alt: 'Ilustração de um personagem com jaqueta bege, retrato',
    date: '12 de setembro',
    readTime: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
  },
  {
    image: '/kurio/blog-2.png',
    alt: 'Ilustração de um personagem com óculos escuros e jaqueta verde, retrato',
    date: '13 de setembro',
    readTime: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    excerpt: 'Conheça criadores que moldam a cultura digital.',
  },
  {
    image: '/kurio/blog-3.png',
    alt: 'Ilustração de um personagem com chapéu de pescador, retrato',
    date: '15 de setembro',
    readTime: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.',
  },
  {
    image: '/kurio/blog-4.png',
    alt: 'Ilustração de um personagem com fone de ouvido, retrato',
    date: '15 de setembro',
    readTime: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    excerpt: 'Proteja sua carteira, seus ativos e sua identidade.',
  },
]

function ForaDeEscopo({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span aria-disabled="true" className={cn('inline-flex items-center gap-1.5 text-sm font-semibold text-primary', className)}>
      {children}
      <ArrowRight aria-hidden="true" className="size-4" />
      <span className="sr-only"> (não faz parte desta entrega)</span>
    </span>
  )
}

export function HomePromoSections() {
  return (
    <>
      <section aria-label="Destaques da Kurio" className="grid gap-5 sm:grid-cols-2">
        {PROMOS.map((p) => (
          <div key={p.title} className="flex items-center gap-5 rounded-xl bg-card p-4">
            <img src={p.image} alt={p.alt} width={160} height={138} className="h-[138px] w-40 shrink-0 rounded-lg object-cover" />
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold leading-snug">{p.title}</h3>
              <p className="text-sm leading-5 text-muted-foreground">{p.description}</p>
              <ForaDeEscopo>Explorar</ForaDeEscopo>
            </div>
          </div>
        ))}
      </section>

      <section aria-labelledby="blog-title" className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 id="blog-title" className="text-2xl font-bold md:text-3xl">
            Diário da Cunhagem
          </h2>
          <p className="text-sm text-muted-foreground">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ARTICLES.map((a) => (
            <article key={a.title} className="flex flex-col gap-3">
              <img src={a.image} alt={a.alt} width={250} height={170} className="aspect-[3/2] w-full rounded-xl object-cover" />
              <p className="text-xs text-muted-foreground">
                {a.date} · {a.readTime}
              </p>
              <h3 className="text-base font-semibold leading-snug">{a.title}</h3>
              <p className="text-sm leading-5 text-muted-foreground">{a.excerpt}</p>
              <ForaDeEscopo className="mt-auto">Ler mais</ForaDeEscopo>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

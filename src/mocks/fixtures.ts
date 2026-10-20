/**
 * Fixtures determinísticas do catálogo simulado.
 * Todos os nomes, criadores e descrições são fictícios.
 * As fotos dos NFTs (public/kurio/) são recortes reais do Figma, cicladas
 * pelos 40 itens (REAL_IMAGES abaixo). Avatares de criador continuam gerados.
 */
import type { Category, Creator, Edition, Network, NftDetail } from '@/contracts'

export const SEED_CREATORS: Creator[] = [
  { id: 'creator-01', name: 'Lia Vórtice', avatarUrl: '/avatars/creator-01.svg' },
  { id: 'creator-02', name: 'Caio Prisma', avatarUrl: '/avatars/creator-02.svg' },
  { id: 'creator-03', name: 'Nina Ferraz', avatarUrl: '/avatars/creator-03.svg' },
  { id: 'creator-04', name: 'Otto Lumen', avatarUrl: '/avatars/creator-04.svg' },
  { id: 'creator-05', name: 'Rafa Neblina', avatarUrl: '/avatars/creator-05.svg' },
  { id: 'creator-06', name: 'Duda Quasar', avatarUrl: '/avatars/creator-06.svg' },
  { id: 'creator-07', name: 'Teo Malaquita', avatarUrl: '/avatars/creator-07.svg' },
  { id: 'creator-08', name: 'Bia Cobalto', avatarUrl: '/avatars/creator-08.svg' },
  { id: 'creator-09', name: 'Joca Pixelado', avatarUrl: '/avatars/creator-09.svg' },
  { id: 'creator-10', name: 'Mel Arpejo', avatarUrl: '/avatars/creator-10.svg' },
]

/**
 * 10 retratos reais recortados do Figma (public/kurio/). Os 40 itens do
 * catálogo ciclam por eles — não há arte única por NFT, por decisão: a
 * fidelidade de usar fotos reais do arquivo venceu a de ter 40 imagens
 * distintas (que exigiria gerar arte nova, fora do que o Figma mostra).
 */
const REAL_IMAGES: { src: string; alt: string }[] = [
  { src: '/kurio/emerald-ape-hero.jpg', alt: 'Retrato ilustrado de um macaco com óculos escuros e jaqueta verde' },
  { src: '/kurio/sage-nomad-hero.jpg', alt: 'Retrato ilustrado de um macaco com chapéu de pescador e moletom lilás' },
  { src: '/kurio/neon-vessel-hero.jpg', alt: 'Retrato ilustrado de um macaco com blazer bege e suéter verde' },
  { src: '/kurio/golden-signal-hero.jpg', alt: 'Retrato ilustrado de um macaco dourado com fone de ouvido verde' },
  { src: '/kurio/armored-gorilla-hero.jpg', alt: 'Retrato ilustrado de um gorila com protetores auriculares futuristas' },
  { src: '/kurio/astronaut-hero.jpg', alt: 'Retrato ilustrado de um gorila com traje de astronauta' },
  { src: '/kurio/aviator-goggles-hero.jpg', alt: 'Retrato ilustrado de um macaco com óculos de aviador e suéter' },
  { src: '/kurio/bandana-hero.jpg', alt: 'Retrato ilustrado de um macaco com bandana e jaqueta de couro' },
  { src: '/kurio/red-beanie-hero.jpg', alt: 'Retrato ilustrado de um macaco com gorro vermelho e camisa xadrez' },
  { src: '/kurio/suit-and-chain-hero.jpg', alt: 'Retrato ilustrado de um gorila de terno com corrente dourada' },
]

/** [preço, supply, disponível, máximo por pedido] */
type EditionSpec = [price: string, supply: number, available: number, maxPerOrder: number]

interface NftSpec {
  name: string
  category: Category
  creator: number
  collection: string
  description: string
  visual: string
  tags: string[]
  editions: EditionSpec[]
  featured?: boolean
  network?: Network
  /** Substitui a imagem gerada por um asset real (ex.: recorte do Figma). */
  imageOverride?: { src: string; alt: string }
}

const EDITION_KEYS = [
  ['std', 'Standard'],
  ['gold', 'Gold'],
  ['plat', 'Platinum'],
] as const

const SPECS: NftSpec[] = [
  /* 01 */ {
    name: 'Emerald Ape #042',
    category: 'art',
    creator: 1,
    collection: 'Céus Elétricos',
    description: 'Um colecionável de edição gênese: jaqueta universitária verde, pingente de esmeralda e óculos redondos. Parte do primeiro lote cunhado na Kurio.',
    visual: 'retrato ilustrado de um macaco com jaqueta verde e pingente de esmeralda',
    tags: ['gênese', 'retrato', 'edição limitada'],
    editions: [
      ['1.19', 20, 10, 5],
      ['1.69', 10, 6, 3],
      ['1.99', 5, 3, 1],
    ],
    featured: true,
    imageOverride: { src: '/kurio/emerald-ape-hero.jpg', alt: 'Emerald Ape #042: retrato ilustrado de um macaco com jaqueta verde e pingente de esmeralda' },
  },
  /* 02 */ {
    name: 'Faixas do Silêncio',
    category: 'music',
    creator: 10,
    collection: 'Partituras Visuais',
    description: 'Cada faixa diagonal representa um compasso de uma música que nunca foi tocada em voz alta.',
    visual: 'faixas diagonais roxas e coral',
    tags: ['som', 'ritmo'],
    editions: [
      ['0.08', 50, 31, 5],
      ['0.32', 15, 9, 2],
    ],
  },
  /* 03 */ {
    name: 'Sage Nomad #009',
    category: 'art',
    creator: 3,
    collection: 'Gênese Kurio',
    description: 'Chapéu de explorador, moletom lilás: o colecionável gênese número 9, parte do primeiro lote cunhado na Kurio.',
    visual: 'retrato ilustrado de um macaco com chapéu de pescador e moletom lilás',
    tags: ['gênese', 'retrato', 'edição limitada'],
    editions: [
      ['1.69', 40, 22, 4],
      ['2.4', 8, 4, 1],
    ],
    featured: true,
    imageOverride: { src: '/kurio/sage-nomad-hero.jpg', alt: 'Sage Nomad #009: retrato ilustrado de um macaco com chapéu de pescador e moletom lilás' },
  },
  /* 04 */ {
    name: 'Anéis de Saturno Fictício',
    category: 'virtual-worlds',
    creator: 4,
    collection: 'Planetas de Bolso',
    description: 'O mapa orbital de um planeta que só existe neste metaverso, com anéis que mudam de cor ao entardecer.',
    visual: 'anéis concêntricos dourados e roxos',
    tags: ['planeta', 'órbita', 'metaverso'],
    editions: [['1.2', 12, 7, 2]],
  },
  /* 05 */ {
    name: 'Átomo Mensageiro',
    category: 'collectibles',
    creator: 6,
    collection: 'Partículas Raras',
    description: 'Colecionável da série Partículas Raras: um átomo que carrega mensagens entre galáxias vizinhas.',
    visual: 'núcleo rosa com órbitas elípticas ciano',
    tags: ['ciência', 'série', 'raro'],
    editions: [
      ['0.045', 100, 64, 5],
      ['0.2', 20, 0, 2],
      ['0.9', 5, 2, 1],
    ],
  },
  /* 06 */ {
    name: 'Quadrantes Laranja',
    category: 'utility',
    creator: 9,
    collection: 'Passes do Ateliê',
    description: 'Passe de acesso às oficinas mensais do ateliê, com grade geométrica que muda a cada temporada.',
    visual: 'grade de quadrados e círculos laranja e lilás',
    tags: ['passe', 'acesso', 'oficina'],
    editions: [
      ['0.3', 60, 41, 3],
      ['0.95', 20, 12, 1],
    ],
  },
  /* 07 */ {
    name: 'Neon Vessel #552',
    category: 'art',
    creator: 7,
    collection: 'Gênese Kurio',
    description: 'Blazer bege, suéter verde e um brinco dourado: o colecionável gênese número 552 da Kurio.',
    visual: 'retrato ilustrado de um macaco com blazer bege e suéter verde',
    tags: ['gênese', 'retrato', 'edição limitada'],
    editions: [
      ['1.99', 25, 14, 3],
      ['2.6', 5, 3, 1],
    ],
    featured: true,
    imageOverride: { src: '/kurio/neon-vessel-hero.jpg', alt: 'Neon Vessel #552: retrato ilustrado de um macaco com blazer bege e suéter verde' },
  },
  /* 08 */ {
    name: 'Névoa Lilás',
    category: 'video',
    creator: 5,
    collection: 'Loops Lentos',
    description: 'Um loop de doze segundos de névoa se movendo em câmera lenta sobre formas suaves.',
    visual: 'formas orgânicas lilás e turquesa em névoa',
    tags: ['loop', 'calma'],
    editions: [['0.015', 200, 143, 5]],
    network: 'polygon',
  },
  /* 09 */ {
    name: 'Placar Fantasma',
    category: 'sport',
    creator: 2,
    collection: 'Jogos que Ninguém Viu',
    description: 'A lembrança de uma final disputada em um estádio de luz, registrada no instante do gol decisivo.',
    visual: 'ondas vermelhas e alaranjadas em degradê',
    tags: ['final', 'estádio', 'memória'],
    editions: [
      ['0.07', 80, 52, 5],
      ['0.4', 10, 0, 1],
    ],
  },
  /* 10 */ {
    name: 'Trilhos de Cobalto',
    category: 'music',
    creator: 8,
    collection: 'Partituras Visuais',
    description: 'Linhas paralelas que funcionam como um pentagrama, com notas marcadas em azul cobalto.',
    visual: 'faixas diagonais azuis e douradas',
    tags: ['pentagrama', 'azul'],
    editions: [
      ['0.18', 30, 19, 4],
      ['0.66', 10, 5, 2],
      ['1.0005', 3, 2, 1],
    ],
  },
  /* 11 */ {
    name: 'Golden Signal #160',
    category: 'art',
    creator: 3,
    collection: 'Gênese Kurio',
    description: 'Fone de ouvido verde, pelagem dourada: o colecionável gênese número 160 da Kurio.',
    visual: 'retrato ilustrado de um macaco dourado com fone de ouvido verde',
    tags: ['gênese', 'retrato', 'edição limitada'],
    editions: [
      ['0.39', 18, 11, 2],
      ['0.9', 4, 2, 1],
    ],
    featured: true,
    imageOverride: { src: '/kurio/golden-signal-hero.jpg', alt: 'Golden Signal #160: retrato ilustrado de um macaco dourado com fone de ouvido verde' },
  },
  /* 12 */ {
    name: 'Espiral Violeta',
    category: 'art',
    creator: 1,
    collection: 'Céus Elétricos',
    description: 'Uma espiral que puxa o olhar para o centro, inspirada em hipnose e em relógios sem ponteiros.',
    visual: 'anéis concêntricos violeta com centro rosa',
    tags: ['espiral', 'hipnose'],
    editions: [
      ['0.85', 10, 0, 2],
      ['3.2', 2, 0, 1],
    ],
  },
  /* 13 */ {
    name: 'Ilha Orbital',
    category: 'virtual-worlds',
    creator: 4,
    collection: 'Planetas de Bolso',
    description: 'Terreno flutuante para construir sua casa no metaverso, com três luas particulares.',
    visual: 'planeta rosa com órbitas turquesa',
    tags: ['terreno', 'metaverso', 'lua'],
    editions: [
      ['2.4', 6, 4, 1],
      ['4.5', 2, 1, 1],
    ],
  },
  /* 14 */ {
    name: 'Mosaico de Brasa',
    category: 'collectibles',
    creator: 9,
    collection: 'Peças de Mosaico',
    description: 'Peça colecionável de um mosaico de cem partes; juntas, formam uma fogueira digital.',
    visual: 'grade de quadrados vermelhos, lilás e amarelos',
    tags: ['mosaico', 'série'],
    editions: [['0.035', 100, 78, 5]],
    network: 'arbitrum',
  },
  /* 15 */ {
    name: 'Fractal de Gelo',
    category: 'video',
    creator: 7,
    collection: 'Loops Lentos',
    description: 'Triângulos de gelo que se formam e se desfazem em um ciclo contínuo de vinte segundos.',
    visual: 'triângulos claros sobre verde-petróleo',
    tags: ['gelo', 'loop', 'geometria'],
    editions: [
      ['0.12', 40, 25, 3],
      ['0.5', 8, 5, 1],
    ],
  },
  /* 16 */ {
    name: 'Jardim Noturno',
    category: 'art',
    creator: 5,
    collection: 'Flora Impossível',
    description: 'Flores sem nome que só se abrem à noite, desenhadas com formas suaves e cores saturadas.',
    visual: 'formas orgânicas roxas e douradas',
    tags: ['flora', 'noite', 'orgânico'],
    editions: [
      ['0.6', 20, 13, 3],
      ['1.75', 6, 4, 1],
      ['3.9', 1, 1, 1],
    ],
    featured: true,
  },
  /* 17 */ {
    name: 'Aurora Boreal Sintética',
    category: 'photography',
    creator: 1,
    collection: 'Céus Elétricos',
    description: 'Céu polar reconstruído a partir de dados de sensores, com a aurora em camadas translúcidas.',
    visual: 'triângulos rosa e turquesa sobre céu escuro',
    tags: ['aurora', 'céu', 'dados'],
    editions: [
      ['0.33', 30, 17, 4],
      ['1.1', 6, 3, 1],
    ],
  },
  /* 18 */ {
    name: 'Órbita da Alvorada',
    category: 'sport',
    creator: 2,
    collection: 'Jogos que Ninguém Viu',
    description: 'A trajetória de um saque perfeito, transformada em órbitas ao redor de uma bola luminosa.',
    visual: 'esfera rosa com órbitas em azul-petróleo',
    tags: ['saque', 'trajetória'],
    editions: [
      ['0.09', 60, 0, 5],
      ['0.29', 15, 8, 2],
    ],
  },
  /* 19 */ {
    name: 'Coral Elétrico',
    category: 'art',
    creator: 6,
    collection: 'Flora Impossível',
    description: 'Um recife de coral que pulsa como um circuito, com formas que lembram vida e eletricidade.',
    visual: 'formas orgânicas coral e lilás',
    tags: ['coral', 'circuito'],
    editions: [['0.47', 15, 9, 2]],
  },
  /* 20 */ {
    name: 'Grade Solar',
    category: 'utility',
    creator: 9,
    collection: 'Passes do Ateliê',
    description: 'Ingresso para a mostra anual do ateliê, com direito a uma peça física impressa em edição limitada.',
    visual: 'grade de quadrados amarelos e roxos',
    tags: ['ingresso', 'mostra', 'impressão'],
    editions: [
      ['0.2', 100, 66, 2],
      ['0.8', 25, 14, 1],
    ],
  },
  /* 21 */ {
    name: 'Mar de Índigo',
    category: 'music',
    creator: 10,
    collection: 'Partituras Visuais',
    description: 'A forma de onda de uma canção de ninar, ampliada até virar um mar azul profundo.',
    visual: 'formas azuis e rosa sobre azul-marinho',
    tags: ['canção', 'onda', 'azul'],
    editions: [
      ['0.024', 150, 98, 5],
      ['0.11', 30, 21, 3],
    ],
    network: 'polygon',
  },
  /* 22 */ {
    name: 'Prisma Partido',
    category: 'collectibles',
    creator: 2,
    collection: 'Partículas Raras',
    description: 'O momento exato em que um prisma se parte e a luz escapa em todas as direções.',
    visual: 'formas azuis e amarelas sobrepostas',
    tags: ['prisma', 'luz', 'raro'],
    editions: [
      ['0.38', 20, 12, 3],
      ['1.25', 5, 3, 1],
      ['2.75', 2, 1, 1],
    ],
    featured: true,
  },
  /* 23 */ {
    name: 'Ritmo Listrado',
    category: 'video',
    creator: 8,
    collection: 'Loops Lentos',
    description: 'Listras que deslizam no compasso de um metrônomo, em um loop que nunca repete a mesma cor.',
    visual: 'faixas diagonais quentes com círculo escuro',
    tags: ['listras', 'compasso'],
    editions: [['0.065', 70, 44, 4]],
  },
  /* 24 */ {
    name: 'Bolha de Mel',
    category: 'photography',
    creator: 3,
    collection: 'Marés Inventadas',
    description: 'Macro de uma bolha de mel suspensa no ar, com o mundo inteiro refletido de cabeça para baixo.',
    visual: 'círculos dourados translúcidos',
    tags: ['macro', 'mel', 'reflexo'],
    editions: [
      ['0.27', 25, 16, 3],
      ['0.88', 6, 3, 1],
    ],
  },
  /* 25 */ {
    name: 'Templo dos Ecos',
    category: 'virtual-worlds',
    creator: 4,
    collection: 'Planetas de Bolso',
    description: 'Um templo virtual onde cada passo produz um eco diferente; inclui acesso ao salão principal.',
    visual: 'anéis concêntricos roxos e dourados',
    tags: ['templo', 'eco', 'metaverso'],
    editions: [
      ['1.6', 8, 5, 1],
      ['3.5', 2, 1, 1],
    ],
  },
  /* 26 */ {
    name: 'Satélite Esmeralda',
    category: 'collectibles',
    creator: 6,
    collection: 'Partículas Raras',
    description: 'Um satélite de brinquedo em órbita de um planeta verde, da série Partículas Raras.',
    visual: 'esfera rosa com órbitas em fundo verde',
    tags: ['satélite', 'série'],
    editions: [
      ['0.052', 90, 57, 5],
      ['0.24', 18, 10, 2],
    ],
  },
  /* 27 */ {
    name: 'Arquibancada de Neon',
    category: 'sport',
    creator: 2,
    collection: 'Jogos que Ninguém Viu',
    description: 'A torcida inteira acendendo luzes ao mesmo tempo, vista do alto como um mosaico de neon.',
    visual: 'grade de formas neon em fundo escuro',
    tags: ['torcida', 'neon'],
    editions: [['0.14', 50, 0, 3]],
  },
  /* 28 */ {
    name: 'Folhas de Vidro',
    category: 'art',
    creator: 7,
    collection: 'Geometria Selvagem',
    description: 'Folhas recortadas em vidro colorido que projetam sombras triangulares no chão do ateliê.',
    visual: 'triângulos coloridos sobre azul profundo',
    tags: ['vidro', 'sombra', 'geometria'],
    editions: [
      ['0.72', 14, 8, 2],
      ['2.6', 3, 2, 1],
    ],
  },
  /* 29 */ {
    name: 'Maré Ultravioleta',
    category: 'music',
    creator: 10,
    collection: 'Partituras Visuais',
    description: 'O espectro de um sintetizador analógico durante uma tempestade, convertido em camadas de cor.',
    visual: 'ondas ultravioleta empilhadas',
    tags: ['sintetizador', 'espectro'],
    editions: [
      ['0.16', 40, 26, 4],
      ['0.58', 10, 6, 2],
      ['1.95', 2, 1, 1],
    ],
    featured: true,
  },
  /* 30 */ {
    name: 'Chave do Arquivo',
    category: 'utility',
    creator: 9,
    collection: 'Passes do Ateliê',
    description: 'Chave de acesso vitalício ao arquivo digital do ateliê, com todos os esboços desde a fundação.',
    visual: 'faixas diagonais azuis e amarelas',
    tags: ['acesso', 'arquivo', 'vitalício'],
    editions: [['1.4', 10, 6, 1]],
  },
  /* 31 */ {
    name: 'Câmera Escura',
    category: 'video',
    creator: 5,
    collection: 'Loops Lentos',
    description: 'Luz atravessando um furo minúsculo e desenhando a rua de cabeça para baixo na parede.',
    visual: 'círculos luminosos em tons de vinho',
    tags: ['luz', 'ótica'],
    editions: [
      ['0.095', 35, 0, 3],
      ['0.31', 10, 4, 2],
    ],
  },
  /* 32 */ {
    name: 'Eclipse Coral',
    category: 'photography',
    creator: 1,
    collection: 'Céus Elétricos',
    description: 'Um eclipse visto através de uma lente coral, com halos que se multiplicam ao redor do sol.',
    visual: 'anéis concêntricos coral e amarelos',
    tags: ['eclipse', 'halo'],
    editions: [
      ['0.5', 16, 10, 2],
      ['1.65', 4, 2, 1],
    ],
  },
  /* 33 */ {
    name: 'Cidade Suspensa',
    category: 'virtual-worlds',
    creator: 8,
    collection: 'Planetas de Bolso',
    description: 'Um bairro inteiro pendurado nas nuvens, com lotes disponíveis para construção coletiva.',
    visual: 'esfera central com órbitas em azul e laranja',
    tags: ['cidade', 'nuvem', 'lote'],
    editions: [
      ['0.98', 12, 7, 2],
      ['2.2', 4, 2, 1],
    ],
    network: 'arbitrum',
  },
  /* 34 */ {
    name: 'Carimbo Cósmico',
    category: 'collectibles',
    creator: 9,
    collection: 'Peças de Mosaico',
    description: 'Selo colecionável que carimba sua passagem por cada planeta da coleção Planetas de Bolso.',
    visual: 'grade de selos geométricos coloridos',
    tags: ['selo', 'série', 'mosaico'],
    editions: [
      ['0.028', 120, 85, 5],
      ['0.13', 30, 0, 3],
    ],
  },
  /* 35 */ {
    name: 'Revoada de Triângulos',
    category: 'art',
    creator: 7,
    collection: 'Geometria Selvagem',
    description: 'Um bando de pássaros feito apenas de triângulos, migrando por um céu verde-água.',
    visual: 'triângulos rosa e roxos em revoada',
    tags: ['pássaros', 'migração', 'geometria'],
    editions: [
      ['0.64', 18, 11, 3],
      ['2.35', 4, 3, 1],
    ],
    featured: true,
  },
  /* 36 */ {
    name: 'Sprint Elíptico',
    category: 'sport',
    creator: 6,
    collection: 'Jogos que Ninguém Viu',
    description: 'A curva de uma pista de corrida desenhada pelos passos de um atleta que nunca cansa.',
    visual: 'órbitas elípticas ao redor de uma esfera rosa',
    tags: ['corrida', 'pista'],
    editions: [
      ['0.11', 45, 28, 4],
      ['0.37', 12, 7, 2],
    ],
  },
  /* 37 */ {
    name: 'Selva de Pixels',
    category: 'utility',
    creator: 9,
    collection: 'Passes do Ateliê',
    description: 'Passe para a comunidade fechada de artistas, com votação nas próximas coleções.',
    visual: 'formas orgânicas rosa e azuis',
    tags: ['comunidade', 'votação', 'passe'],
    editions: [
      ['0.005', 300, 212, 5],
      ['0.075', 50, 33, 2],
    ],
    network: 'polygon',
  },
  /* 38 */ {
    name: 'Último Acorde',
    category: 'music',
    creator: 10,
    collection: 'Partituras Visuais',
    description: 'A última nota de um concerto, congelada no instante em que o público prende a respiração.',
    visual: 'formas em azul e laranja sobre azul-marinho',
    tags: ['concerto', 'nota'],
    editions: [['1.3', 5, 0, 1]],
  },
  /* 39 */ {
    name: 'Correnteza Dourada',
    category: 'video',
    creator: 5,
    collection: 'Loops Lentos',
    description: 'Um rio de luz dourada que corre em loop por entre pedras feitas de sombra.',
    visual: 'ondas douradas e azuis em camadas',
    tags: ['rio', 'loop', 'dourado'],
    editions: [
      ['0.205', 22, 14, 3],
      ['0.77', 6, 4, 1],
    ],
  },
  /* 40 */ {
    name: 'Portal de Cobre',
    category: 'virtual-worlds',
    creator: 4,
    collection: 'Planetas de Bolso',
    description: 'Um portal que liga todos os planetas da coleção; quem possui pode viajar sem esperar a fila.',
    visual: 'faixas diagonais acobreadas com círculo escuro',
    tags: ['portal', 'viagem', 'metaverso'],
    editions: [
      ['0.44', 20, 12, 2],
      ['1.9', 5, 3, 1],
      ['3.75', 1, 1, 1],
    ],
  },
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function contractAddressFor(seed: number) {
  let x = (seed * 2654435761) >>> 0
  let hex = ''
  while (hex.length < 40) {
    x = (Math.imul(x ^ (x >>> 13), 1103515245) + 12345) >>> 0
    hex += x.toString(16).padStart(8, '0')
  }
  return `0x${hex.slice(0, 40)}`
}

function createdAtFor(i: number) {
  const base = Date.UTC(2026, 0, 5, 12, 0, 0)
  const offset = i * 6 * 24 * 60 * 60 * 1000 + ((i * 7) % 11) * 60 * 60 * 1000
  return new Date(base + offset).toISOString()
}

/** Comparação de preços com até 4 casas decimais (seguro em float para ordenar). */
function cheapest(editions: Edition[]) {
  return editions.reduce((min, e) => (Number(e.priceEth) < Number(min.priceEth) ? e : min)).priceEth
}

export function floorPriceOf(editions: Edition[]) {
  const available = editions.filter((e) => e.available > 0)
  return cheapest(available.length > 0 ? available : editions)
}

function buildNft(spec: NftSpec, index: number): NftDetail {
  const n = pad(index)
  const id = `nft-${n}`
  const creator = SEED_CREATORS[spec.creator - 1]
  const editions: Edition[] = spec.editions.map(([priceEth, supply, available, maxPerOrder], k) => ({
    id: `${id}-${EDITION_KEYS[k][0]}`,
    name: EDITION_KEYS[k][1],
    priceEth,
    supply,
    available,
    maxPerOrder,
  }))
  const hero = spec.imageOverride ?? REAL_IMAGES[index % REAL_IMAGES.length]
  // As 10 fotos reais se repetem pelos 40 itens; a galeria do detalhe mostra
  // a mesma foto nas 3 posições (não são variações de cor como a arte gerada).
  const images = [hero, hero, hero]
  return {
    id,
    name: spec.name,
    image: images[0].src,
    imageAlt: hero.alt,
    category: spec.category,
    creator,
    collectionName: spec.collection,
    floorPriceEth: floorPriceOf(editions),
    available: editions.reduce((sum, e) => sum + e.available, 0),
    favoritesCount: ((index * 37) % 480) + 12,
    featured: spec.featured ?? false,
    createdAt: createdAtFor(index),
    version: 1,
    description: spec.description,
    images,
    editions,
    tags: spec.tags,
    contractAddress: contractAddressFor(index),
    tokenStandard: 'ERC-1155',
    network: spec.network ?? 'ethereum',
  }
}

export const SEED_NFTS: NftDetail[] = SPECS.map((spec, i) => buildNft(spec, i + 1))

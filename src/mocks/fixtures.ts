/**
 * Fixtures determinísticas do catálogo simulado.
 *
 * Os 40 NFTs ciclam por 10 personagens reais (fotos recortadas do Figma, em
 * public/kurio/). Nome, descrição, tags e imagem vêm todos do MESMO registro
 * de personagem (CHARACTERS), então é impossível um ficar incoerente com o
 * outro — a foto de um gorila nunca pode ter a descrição de outro bicho,
 * porque os dois saem do mesmo objeto. Categoria, criador, coleção e preços
 * continuam variando por posição no catálogo (é isso que torna o catálogo
 * variado; não tem relação com qual foto aparece).
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

interface Character {
  /** Nome em inglês, igual ao arquivo de origem (public/kurio/). */
  name: string
  image: string
  alt: string
  description: string
  tags: string[]
}

/**
 * 10 personagens reais recortados do Figma. O nome é o mesmo do arquivo
 * baixado, em inglês — decisão explícita: não traduzir nem inventar nome
 * fictício para a foto.
 */
const CHARACTERS: Character[] = [
  {
    name: 'Emerald Ape',
    image: '/kurio/emerald-ape-hero.jpg',
    alt: 'Retrato ilustrado de um macaco com óculos escuros e jaqueta universitária verde',
    description: 'Óculos redondos, jaqueta universitária verde e um pingente de esmeralda no pescoço.',
    tags: ['retrato', 'gênese', 'edição limitada'],
  },
  {
    name: 'Sage Nomad',
    image: '/kurio/sage-nomad-hero.jpg',
    alt: 'Retrato ilustrado de um macaco com chapéu de pescador e moletom lilás',
    description: 'Chapéu de explorador e moletom lilás, pronto para a próxima expedição.',
    tags: ['retrato', 'gênese', 'edição limitada'],
  },
  {
    name: 'Neon Vessel',
    image: '/kurio/neon-vessel-hero.jpg',
    alt: 'Retrato ilustrado de um macaco com blazer bege e suéter verde',
    description: 'Blazer bege sobre suéter verde, com um brinco dourado discreto.',
    tags: ['retrato', 'gênese', 'edição limitada'],
  },
  {
    name: 'Golden Signal',
    image: '/kurio/golden-signal-hero.jpg',
    alt: 'Retrato ilustrado de um macaco dourado com fone de ouvido verde',
    description: 'Pelagem dourada e fone de ouvido verde, sempre sintonizado em algo novo.',
    tags: ['retrato', 'gênese', 'edição limitada'],
  },
  {
    name: 'Armored Gorilla',
    image: '/kurio/armored-gorilla-hero.jpg',
    alt: 'Retrato ilustrado de um gorila com protetores auriculares futuristas e colete tático',
    description: 'Protetores auriculares futuristas e colete tático verde-musgo.',
    tags: ['retrato', 'tático', 'edição limitada'],
  },
  {
    name: 'Astronaut',
    image: '/kurio/astronaut-hero.jpg',
    alt: 'Retrato ilustrado de um gorila com traje de astronauta',
    description: 'Traje espacial completo, gola laranja, pronto para a próxima missão fora da atmosfera.',
    tags: ['retrato', 'espaço', 'edição limitada'],
  },
  {
    name: 'Aviator Goggles',
    image: '/kurio/aviator-goggles-hero.jpg',
    alt: 'Retrato ilustrado de um macaco com óculos de aviador e suéter cinza',
    description: 'Óculos de aviador apoiados na testa e um suéter cinza de gola alta.',
    tags: ['retrato', 'aviador', 'edição limitada'],
  },
  {
    name: 'Bandana',
    image: '/kurio/bandana-hero.jpg',
    alt: 'Retrato ilustrado de um macaco com bandana estampada e jaqueta de couro',
    description: 'Bandana estampada amarrada na cabeça e jaqueta de couro marrom.',
    tags: ['retrato', 'street', 'edição limitada'],
  },
  {
    name: 'Red Beanie',
    image: '/kurio/red-beanie-hero.jpg',
    alt: 'Retrato ilustrado de um macaco com gorro vermelho e camisa xadrez',
    description: 'Gorro vermelho puxado até as sobrancelhas e camisa xadrez por baixo.',
    tags: ['retrato', 'casual', 'edição limitada'],
  },
  {
    name: 'Suit And Chain',
    image: '/kurio/suit-and-chain-hero.jpg',
    alt: 'Retrato ilustrado de um gorila de terno verde-petróleo com corrente dourada',
    description: 'Terno verde-petróleo, gravata e uma corrente dourada grossa por cima de tudo.',
    tags: ['retrato', 'executivo', 'edição limitada'],
  },
]

/** [preço, supply, disponível, máximo por pedido] */
type EditionSpec = [price: string, supply: number, available: number, maxPerOrder: number]

interface NftSpec {
  category: Category
  creator: number
  collection: string
  editions: EditionSpec[]
  featured?: boolean
  network?: Network
}

const EDITION_KEYS = [
  ['std', 'Standard'],
  ['gold', 'Gold'],
  ['plat', 'Platinum'],
] as const

/**
 * Variedade de catálogo por posição: categoria, criador, coleção e preços.
 * Não tem relação com qual personagem aparece (isso é CHARACTERS, cíclico).
 */
const SPECS: NftSpec[] = [
  /* 01 */ { category: 'art', creator: 1, collection: 'Gênese Kurio', editions: [['1.19', 20, 10, 5], ['1.69', 10, 6, 3], ['1.99', 5, 3, 1]], featured: true },
  /* 02 */ { category: 'music', creator: 10, collection: 'Partituras Visuais', editions: [['0.08', 50, 31, 5], ['0.32', 15, 9, 2]] },
  /* 03 */ { category: 'art', creator: 3, collection: 'Gênese Kurio', editions: [['1.69', 40, 22, 4], ['2.4', 8, 4, 1]], featured: true },
  /* 04 */ { category: 'virtual-worlds', creator: 4, collection: 'Planetas de Bolso', editions: [['1.2', 12, 7, 2]] },
  /* 05 */ { category: 'collectibles', creator: 6, collection: 'Partículas Raras', editions: [['0.045', 100, 64, 5], ['0.2', 20, 0, 2], ['0.9', 5, 2, 1]] },
  /* 06 */ { category: 'utility', creator: 9, collection: 'Passes do Ateliê', editions: [['0.3', 60, 41, 3], ['0.95', 20, 12, 1]] },
  /* 07 */ { category: 'art', creator: 7, collection: 'Gênese Kurio', editions: [['1.99', 25, 14, 3], ['2.6', 5, 3, 1]], featured: true },
  /* 08 */ { category: 'video', creator: 5, collection: 'Loops Lentos', editions: [['0.015', 200, 143, 5]], network: 'polygon' },
  /* 09 */ { category: 'sport', creator: 2, collection: 'Jogos que Ninguém Viu', editions: [['0.07', 80, 52, 5], ['0.4', 10, 0, 1]] },
  /* 10 */ { category: 'music', creator: 8, collection: 'Partituras Visuais', editions: [['0.18', 30, 19, 4], ['0.66', 10, 5, 2], ['1.0005', 3, 2, 1]] },
  /* 11 */ { category: 'art', creator: 3, collection: 'Gênese Kurio', editions: [['0.39', 18, 11, 2], ['0.9', 4, 2, 1]], featured: true },
  /* 12 */ { category: 'art', creator: 1, collection: 'Céus Elétricos', editions: [['0.85', 10, 0, 2], ['3.2', 2, 0, 1]] },
  /* 13 */ { category: 'virtual-worlds', creator: 4, collection: 'Planetas de Bolso', editions: [['2.4', 6, 4, 1], ['4.5', 2, 1, 1]] },
  /* 14 */ { category: 'collectibles', creator: 9, collection: 'Peças de Mosaico', editions: [['0.035', 100, 78, 5]], network: 'arbitrum' },
  /* 15 */ { category: 'video', creator: 7, collection: 'Loops Lentos', editions: [['0.12', 40, 25, 3], ['0.5', 8, 5, 1]] },
  /* 16 */ { category: 'art', creator: 5, collection: 'Flora Impossível', editions: [['0.6', 20, 13, 3], ['1.75', 6, 4, 1], ['3.9', 1, 1, 1]], featured: true },
  /* 17 */ { category: 'photography', creator: 1, collection: 'Céus Elétricos', editions: [['0.33', 30, 17, 4], ['1.1', 6, 3, 1]] },
  /* 18 */ { category: 'sport', creator: 2, collection: 'Jogos que Ninguém Viu', editions: [['0.09', 60, 0, 5], ['0.29', 15, 8, 2]] },
  /* 19 */ { category: 'art', creator: 6, collection: 'Flora Impossível', editions: [['0.47', 15, 9, 2]] },
  /* 20 */ { category: 'utility', creator: 9, collection: 'Passes do Ateliê', editions: [['0.2', 100, 66, 2], ['0.8', 25, 14, 1]] },
  /* 21 */ { category: 'music', creator: 10, collection: 'Partituras Visuais', editions: [['0.024', 150, 98, 5], ['0.11', 30, 21, 3]], network: 'polygon' },
  /* 22 */ { category: 'collectibles', creator: 2, collection: 'Partículas Raras', editions: [['0.38', 20, 12, 3], ['1.25', 5, 3, 1], ['2.75', 2, 1, 1]], featured: true },
  /* 23 */ { category: 'video', creator: 8, collection: 'Loops Lentos', editions: [['0.065', 70, 44, 4]] },
  /* 24 */ { category: 'photography', creator: 3, collection: 'Marés Inventadas', editions: [['0.27', 25, 16, 3], ['0.88', 6, 3, 1]] },
  /* 25 */ { category: 'virtual-worlds', creator: 4, collection: 'Planetas de Bolso', editions: [['1.6', 8, 5, 1], ['3.5', 2, 1, 1]] },
  /* 26 */ { category: 'collectibles', creator: 6, collection: 'Partículas Raras', editions: [['0.052', 90, 57, 5], ['0.24', 18, 10, 2]] },
  /* 27 */ { category: 'sport', creator: 2, collection: 'Jogos que Ninguém Viu', editions: [['0.14', 50, 0, 3]] },
  /* 28 */ { category: 'art', creator: 7, collection: 'Geometria Selvagem', editions: [['0.72', 14, 8, 2], ['2.6', 3, 2, 1]] },
  /* 29 */ { category: 'music', creator: 10, collection: 'Partituras Visuais', editions: [['0.16', 40, 26, 4], ['0.58', 10, 6, 2], ['1.95', 2, 1, 1]], featured: true },
  /* 30 */ { category: 'utility', creator: 9, collection: 'Passes do Ateliê', editions: [['1.4', 10, 6, 1]] },
  /* 31 */ { category: 'video', creator: 5, collection: 'Loops Lentos', editions: [['0.095', 35, 0, 3], ['0.31', 10, 4, 2]] },
  /* 32 */ { category: 'photography', creator: 1, collection: 'Céus Elétricos', editions: [['0.5', 16, 10, 2], ['1.65', 4, 2, 1]] },
  /* 33 */ { category: 'virtual-worlds', creator: 8, collection: 'Planetas de Bolso', editions: [['0.98', 12, 7, 2], ['2.2', 4, 2, 1]], network: 'arbitrum' },
  /* 34 */ { category: 'collectibles', creator: 9, collection: 'Peças de Mosaico', editions: [['0.028', 120, 85, 5], ['0.13', 30, 0, 3]] },
  /* 35 */ { category: 'art', creator: 7, collection: 'Geometria Selvagem', editions: [['0.64', 18, 11, 3], ['2.35', 4, 3, 1]], featured: true },
  /* 36 */ { category: 'sport', creator: 6, collection: 'Jogos que Ninguém Viu', editions: [['0.11', 45, 28, 4], ['0.37', 12, 7, 2]] },
  /* 37 */ { category: 'utility', creator: 9, collection: 'Passes do Ateliê', editions: [['0.005', 300, 212, 5], ['0.075', 50, 33, 2]], network: 'polygon' },
  /* 38 */ { category: 'music', creator: 10, collection: 'Partituras Visuais', editions: [['1.3', 5, 0, 1]] },
  /* 39 */ { category: 'video', creator: 5, collection: 'Loops Lentos', editions: [['0.205', 22, 14, 3], ['0.77', 6, 4, 1]] },
  /* 40 */ { category: 'virtual-worlds', creator: 4, collection: 'Planetas de Bolso', editions: [['0.44', 20, 12, 2], ['1.9', 5, 3, 1], ['3.75', 1, 1, 1]] },
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

  // Personagem cíclico: nome, descrição, tags e imagem vêm todos do mesmo
  // registro, então nunca podem ficar incoerentes entre si.
  const character = CHARACTERS[(index - 1) % CHARACTERS.length]
  const name = `${character.name} #${index}`
  const heroImage = { src: character.image, alt: `${character.name}: ${character.alt}` }
  const images = [heroImage, heroImage, heroImage]

  return {
    id,
    name,
    image: heroImage.src,
    imageAlt: heroImage.alt,
    category: spec.category,
    creator,
    collectionName: spec.collection,
    floorPriceEth: floorPriceOf(editions),
    available: editions.reduce((sum, e) => sum + e.available, 0),
    favoritesCount: ((index * 37) % 480) + 12,
    featured: spec.featured ?? false,
    createdAt: createdAtFor(index),
    version: 1,
    description: character.description,
    images,
    editions,
    tags: character.tags,
    contractAddress: contractAddressFor(index),
    tokenStandard: 'ERC-1155',
    network: spec.network ?? 'ethereum',
  }
}

export const SEED_NFTS: NftDetail[] = SPECS.map((spec, i) => buildNft(spec, i + 1))

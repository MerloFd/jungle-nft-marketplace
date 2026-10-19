/**
 * Configuração versionada da auditoria Lighthouse.
 * Páginas: início e detalhe do NFT. Perfis: mobile (padrão do Lighthouse,
 * Moto G Power emulado + throttling 4G lento) e desktop.
 * Cenário de mocks: `default` (latência 150 a 400ms), com build otimizado.
 */
export const PAGES = [
  { name: 'inicio', path: '/' },
  { name: 'detalhe', path: '/nft/nft-01' },
]
export const RUNS = 3
export const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
export const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }

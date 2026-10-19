/**
 * Fixtures do Playwright.
 *
 * Toda rota de teste começa de um estado conhecido: contexto novo (storage
 * vazio), cenário escolhido antes do primeiro script da página e
 * `window.__mock.reset()` para restaurar o seed do backend simulado.
 */
import { test as base, expect, type Locator, type Page } from '@playwright/test'
import { USERS, type ScenarioName } from './mock'

export interface AppFixture {
  /** Abre uma rota com o cenário desejado e o backend simulado resetado. */
  boot(path?: string, scenario?: ScenarioName): Promise<void>
  /** Troca o cenário em tempo de execução (sem recarregar). */
  setScenario(scenario: ScenarioName): Promise<void>
  /** Entra pela interface (fluxo real: formulário + redirect). */
  login(user?: keyof typeof USERS): Promise<void>
  /** Adiciona o primeiro NFT disponível ao carrinho, pela interface. */
  addFirstNftToCart(quantity?: number): Promise<void>
  /** Espera o socket estar conectado (eventos em tempo real confiáveis). */
  waitForSocket(): Promise<void>
  /** Espera não haver nenhum indicador de atualização em segundo plano na tela. */
  waitForIdle(): Promise<void>
  /** Badge de itens do carrinho no cabeçalho (filtra a instância visível do breakpoint). */
  cartBadge(): Locator
  /** Último texto anunciado na região aria-live. */
  announced(politeness?: 'polite' | 'assertive'): Locator
}

async function waitForMocks(page: Page) {
  await page.waitForFunction(() => window.__mockReady === true, null, { timeout: 30_000 })
}

export const test = base.extend<{ app: AppFixture }>({
  app: async ({ page }, use) => {
    const app: AppFixture = {
      async boot(path = '/', scenario: ScenarioName = 'fast') {
        // O cenário entra pelo localStorage antes do bootstrap: evita um
        // primeiro render com o cenário errado.
        await page.addInitScript((s) => {
          try {
            localStorage.setItem('mock:scenario', s as string)
          } catch {
            /* storage indisponível */
          }
        }, scenario)
        await page.goto(path)
        await waitForMocks(page)
        await page.evaluate(() => window.__mock!.reset())
        // O reset recria o seed: recarrega para a interface ler o estado novo.
        await page.reload()
        await waitForMocks(page)
      },

      async setScenario(scenario) {
        await page.evaluate((s) => window.__mock!.setScenario(s as ScenarioName), scenario)
      },

      async login(user = 'ana') {
        const creds = USERS[user]
        if (!page.url().includes('/login')) await page.goto('/login')
        await page.getByTestId('login-form').waitFor()
        await page.getByLabel(/e-?mail/i).fill(creds.email)
        await page.getByLabel(/senha/i).fill(creds.password)
        await page.getByRole('button', { name: /entrar/i }).click()
        await expect(page.getByTestId('login-form')).toBeHidden()
      },

      async addFirstNftToCart(quantity = 1) {
        await page.getByTestId('catalog').waitFor()
        await page.locator('[data-testid^="nft-card-"]').first().click()
        await page.getByTestId('nft-detail').waitFor()
        for (let i = 1; i < quantity; i++) await page.getByTestId('qty-increase').click()
        await page.getByTestId('add-to-cart').click()
      },

      async waitForSocket() {
        await page.waitForFunction(() => window.__realtimeStatus === 'connected', null, { timeout: 20_000 })
      },

      async waitForIdle() {
        await expect(page.locator('[data-testid$="-updating"]')).toHaveCount(0)
      },

      cartBadge() {
        // O cabeçalho monta o link do carrinho em duas barras (desktop e mobile):
        // só uma está visível por viewport.
        return page.getByTestId('cart-count').filter({ visible: true }).first()
      },

      announced(politeness = 'polite') {
        return page.getByTestId(`live-region-${politeness}`)
      },
    }
    await use(app)
  },
})

export { expect }

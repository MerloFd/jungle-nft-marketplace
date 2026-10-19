import type { Locator, Page } from '@playwright/test'
import { test, expect } from './support/app'
import type { AppFixture } from './support/app'
import { irAteRevisao } from './support/checkout'

// Baselines serão geradas com --update-snapshots após o ajuste de composição (Figma).
const ESCONDER = `
  [data-testid="mock-panel-trigger"], [data-testid="connection-banner"] { visibility: hidden !important; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
`

async function preparar(page: Page, app: AppFixture) {
  await page.addStyleTag({ content: ESCONDER })
  await app.waitForIdle()
  // As imagens são lazy: sem forçar o carregamento, o fullPage sai com buracos.
  await page.evaluate(async () => {
    Array.prototype.forEach.call(document.images, (img: HTMLImageElement) => (img.loading = 'eager'))
    await document.fonts.ready
  })
  await page.waitForFunction(() => Array.prototype.every.call(document.images, (i: HTMLImageElement) => i.complete), null, { timeout: 15_000 })
  await page.mouse.move(0, 0)
}

function mascaras(page: Page): Locator[] {
  return [page.getByTestId('quote-expires-at'), page.getByTestId('mock-panel-trigger')]
}

test.describe('regressão visual', () => {
  test.fixme('início', async ({ page, app }) => {
    await app.boot('/', 'fast')
    await expect(page.getByTestId('catalog')).toBeVisible()
    await preparar(page, app)

    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true, mask: mascaras(page) })
  })

  test.fixme('detalhe', async ({ page, app }) => {
    await app.boot('/nft/nft-01', 'fast')
    await expect(page.getByTestId('nft-detail')).toBeVisible()
    await preparar(page, app)

    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true, mask: mascaras(page) })
  })

  test.fixme('carrinho', async ({ page, app }) => {
    await app.boot('/nft/nft-01', 'fast')
    await expect(page.getByTestId('nft-detail')).toBeVisible()
    await page.getByTestId('add-to-cart').click()
    await expect(app.cartBadge()).toHaveText('1', { timeout: 25_000 })

    await page.goto('/cart')
    await expect(page.getByTestId('cart')).toBeVisible()
    await preparar(page, app)

    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true, mask: mascaras(page) })
  })

  test.fixme('pagamento', async ({ page, app }) => {
    await irAteRevisao(page, app, { scenario: 'fast' })
    await preparar(page, app)

    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true, mask: mascaras(page) })
  })
})

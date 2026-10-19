import { expect, type Page } from '@playwright/test'
import type { AppFixture } from './app'
import type { ScenarioName } from './mock'

/** Leva da home até a etapa de revisão do checkout, com cotação pronta. */
export async function irAteRevisao(
  page: Page,
  app: AppFixture,
  { scenario = 'fast', user = 'ana' as 'ana' | 'bruno' }: { scenario?: ScenarioName; user?: 'ana' | 'bruno' } = {},
) {
  await app.boot('/nft/nft-01', scenario)
  await expect(page.getByTestId('nft-detail')).toBeVisible()
  await page.getByTestId('add-to-cart').click()
  await expect(app.cartBadge()).toHaveText('1', { timeout: 25_000 })

  await app.login(user)
  // O merge do carrinho de visitante roda depois do login: esperar evita recarregar no meio dele.
  await expect(app.cartBadge()).toHaveText('1', { timeout: 25_000 })
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout')).toBeVisible()

  await page.getByLabel('Nome completo').fill('Ana Souza')
  await page.getByLabel('E-mail', { exact: false }).first().fill('ana@jungle.dev')
  await page.getByLabel('País').fill('Brasil')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.locator('[data-testid^="wallet-option-"]').first().click()
  await page.getByTestId('wallet-connect').click()
  await expect(page.getByTestId('wallet-status')).toContainText(/conectad/i)
  await page.getByRole('button', { name: 'Continuar' }).click()

  await expect(page.getByTestId('quote')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('place-order')).toBeEnabled()
}

export async function pedidosNoMock(page: Page) {
  return page.evaluate(() => Object.values(window.__mock!.state().orders))
}

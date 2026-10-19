import type { Page } from '@playwright/test'
import { test, expect } from './support/app'
import { USERS } from './support/mock'

// No mobile o logout fica dentro do menu lateral.
async function sair(page: Page) {
  const menu = page.getByRole('button', { name: /menu/i })
  if (await menu.first().isVisible().catch(() => false)) await menu.first().click()
  await page.getByRole('button', { name: /^sair$/i }).click()
}

test.describe('sessão', () => {
  test('cadastro com e-mail já usado mostra o erro da API no campo', async ({ page, app }) => {
    await app.boot('/register', 'fast')
    await expect(page.getByTestId('register-form')).toBeVisible()

    await page.getByLabel('Nome', { exact: false }).first().fill('Ana Clone')
    await page.getByLabel(/nome de usuário/i).fill('anaclone')
    await page.getByLabel(/e-?mail/i).fill(USERS.ana.email)
    await page.getByLabel(/senha/i).fill('jungle123')
    await page.getByRole('button', { name: /criar conta/i }).click()

    const email = page.getByLabel(/e-?mail/i)
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const descrito = String(await email.getAttribute('aria-describedby')).split(' ').pop()
    await expect(page.locator(`#${descrito}`)).toContainText(/já está cadastrado/i)
    await expect(page.getByTestId('register-form')).toBeVisible()
  })

  test('login entra na conta e logout volta ao estado de visitante', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await app.login('ana')

    await page.goto('/account/profile')
    await expect(page.getByTestId('profile-form')).toBeVisible()

    await sair(page)

    // O logout não navega sozinho: a guarda da rota privada é verificada no próximo acesso.
    await page.goto('/account/profile')
    await expect(page.getByTestId('login-form')).toBeVisible()
    await expect(page).toHaveURL(/redirect/)
  })

  test('sessão expirada durante a navegação volta ao login com aviso e redirect', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await app.login('ana')

    await page.goto('/account/profile')
    await expect(page.getByTestId('profile-form')).toBeVisible()

    await page.evaluate(() => window.__mock!.expireSessions())
    await page.getByRole('button', { name: /salvar alterações/i }).click()

    await expect(page.getByTestId('login-form')).toBeVisible()
    await expect(page.getByTestId('login-expired-notice')).toBeVisible()
    await expect(page).toHaveURL(/reason=expired/)
    await expect(page).toHaveURL(/redirect=%2Faccount%2Fprofile/)

    // Entrar de novo retoma exatamente o fluxo interrompido.
    await app.login('ana')
    await expect(page.getByTestId('profile-form')).toBeVisible()
    await expect(page).toHaveURL(/\/account\/profile/)
  })

  test('troca de usuário não vaza carrinho nem favoritos entre contas', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await app.login('ana')

    await page.goto('/nft/nft-01')
    await expect(page.getByTestId('nft-detail')).toBeVisible()
    await page.getByTestId('add-to-cart').click()
    await expect(app.cartBadge()).toHaveText('1', { timeout: 25_000 })

    // A conta de ana já nasce com nft-02 nos favoritos (seed do backend).
    await page.goto('/nft/nft-02')
    await expect(page.getByTestId('favorite-toggle')).toHaveAttribute('aria-pressed', 'true')

    await sair(page)
    await expect(app.cartBadge()).toHaveCount(0)

    await app.login('bruno')
    await page.goto('/nft/nft-02')
    await expect(page.getByTestId('nft-detail')).toBeVisible()
    await expect(page.getByTestId('favorite-toggle')).toHaveAttribute('aria-pressed', 'false')

    await page.goto('/cart')
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })
})

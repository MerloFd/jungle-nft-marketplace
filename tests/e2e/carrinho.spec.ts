import { test, expect } from './support/app'
import { COUPONS } from './support/mock'

test.describe('carrinho', () => {
  test('aumenta, diminui e remove itens com o resumo vindo da API', async ({ page, app }) => {
    await app.boot('/nft/nft-01', 'fast')
    await expect(page.getByTestId('nft-detail')).toBeVisible()
    await page.getByTestId('add-to-cart').click()
    await expect(app.cartBadge()).toHaveText('1', { timeout: 25_000 })

    await page.goto('/cart')
    await expect(page.getByTestId('cart')).toBeVisible()

    const qty = page.getByTestId('cart-item-qty')
    const subtotal = page.getByTestId('summary-subtotal')
    const subtotalInicial = String(await subtotal.innerText())

    await page.getByRole('button', { name: /^aumentar quantidade de/i }).click()
    await expect(qty).toHaveValue('2')
    await expect(app.cartBadge()).toHaveText('2', { timeout: 25_000 })
    await expect(subtotal).not.toHaveText(subtotalInicial)

    await page.getByRole('button', { name: /^diminuir quantidade de/i }).click()
    await expect(qty).toHaveValue('1')
    await expect(subtotal).toHaveText(subtotalInicial)

    await page.getByTestId('cart-item-remove').click()
    await expect(page.getByTestId('cart-empty')).toBeVisible()
    await expect(app.cartBadge()).toHaveCount(0)
  })

  test('cupom válido aplica desconto e cupom expirado erra no próprio campo', async ({ page, app }) => {
    await app.boot('/nft/nft-01', 'fast')
    await expect(page.getByTestId('nft-detail')).toBeVisible()
    await page.getByTestId('add-to-cart').click()
    await expect(app.cartBadge()).toHaveText('1', { timeout: 25_000 })

    await page.goto('/cart')
    await expect(page.getByTestId('cart')).toBeVisible()

    await page.getByTestId('coupon-input').fill(COUPONS.expired)
    await page.getByTestId('coupon-apply').click()

    await expect(page.getByTestId('coupon-error')).toBeVisible()
    const input = page.getByTestId('coupon-input')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    const descrito = String(await input.getAttribute('aria-describedby')).split(' ').pop()
    await expect(page.locator(`#${descrito}`)).not.toBeEmpty()
    await expect(page.getByTestId('coupon-applied')).toHaveCount(0)

    const descontoSemCupom = String(await page.getByTestId('summary-discount').innerText())
    await input.fill(COUPONS.valid)
    await page.getByTestId('coupon-apply').click()

    await expect(page.getByTestId('coupon-applied')).toContainText(COUPONS.valid)
    await expect(page.getByTestId('summary-discount')).not.toHaveText(descontoSemCupom)
  })

  test('carrinho de visitante sobrevive ao refresh e é incorporado ao fazer login', async ({ page, app }) => {
    await app.boot('/nft/nft-01', 'fast')
    await expect(page.getByTestId('nft-detail')).toBeVisible()
    await page.getByTestId('add-to-cart').click()
    await expect(app.cartBadge()).toHaveText('1', { timeout: 25_000 })

    await page.reload()
    await expect(app.cartBadge()).toHaveText('1', { timeout: 25_000 })

    await page.goto('/cart')
    await expect(page.getByTestId('cart')).toContainText('Emerald Ape #1')

    await app.login('ana')
    await page.goto('/cart')

    await expect(page.getByTestId('cart')).toBeVisible()
    await expect(app.cartBadge()).toHaveText('1', { timeout: 25_000 })
    await expect(page.locator('li[data-testid^="cart-item-"]')).toHaveCount(1)
    await expect(page.getByTestId('cart')).toContainText('Emerald Ape #1')
  })
})

import { test, expect } from './support/app'
import { irAteRevisao, pedidosNoMock } from './support/checkout'

test.describe('pagamento', () => {
  test('pagamento recusado mostra o motivo no recibo e preserva o carrinho', async ({ page, app }) => {
    await irAteRevisao(page, app, { scenario: 'payment-declined' })

    await page.getByTestId('place-order').click()

    await expect(page.getByTestId('order')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('order-status')).toHaveAttribute('data-status', 'declined', { timeout: 20_000 })
    await expect(page.getByTestId('order-decline-reason')).not.toBeEmpty()
    await expect(page.getByTestId('order-retry')).toBeVisible()

    await page.goto('/cart')
    await expect(page.getByTestId('cart')).toBeVisible()
    await expect(page.locator('li[data-testid^="cart-item-"]')).toHaveCount(1)
  })

  test('clique duplo em confirmar cria um único pedido', async ({ page, app }) => {
    await irAteRevisao(page, app, { scenario: 'fast' })

    await page.getByTestId('place-order').dblclick()

    await expect(page.getByTestId('order')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('order-status')).toHaveAttribute('data-status', 'confirmed', { timeout: 20_000 })

    expect(await pedidosNoMock(page)).toHaveLength(1)
  })

  test('timeout do pedido se recupera pela mesma Idempotency-Key e não duplica', async ({ page, app }) => {
    // A primeira resposta do mock demora mais que o timeout do cliente (10s).
    test.setTimeout(120_000)
    await irAteRevisao(page, app, { scenario: 'order-timeout' })

    await page.getByTestId('place-order').click()
    const chave = await page.waitForFunction(() => {
      const raw = sessionStorage.getItem('checkout:idempotencyKey')
      return raw ? (JSON.parse(raw) as { key: string }).key : null
    })

    await expect(page.getByTestId('order')).toBeVisible({ timeout: 60_000 })
    await expect(page.getByTestId('order-status')).toHaveAttribute('data-status', /confirmed|pending/, { timeout: 60_000 })

    const pedidos = await pedidosNoMock(page)
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0].idempotencyKey).toBe(await chave.jsonValue())
  })
})

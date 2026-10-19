/**
 * Cenário 6 da seção 9: compra completa, do catálogo ao recibo confirmado.
 *
 * É o teste que atravessa as três áreas (catálogo → carrinho → checkout) e o
 * único que prova a regra eliminatória "compra só aparece confirmada quando a
 * API devolve status: 'confirmed'".
 */
import { test, expect } from './support/app'

test('compra completa: catálogo → carrinho → checkout → recibo confirmado', async ({ page, app }) => {
  await app.boot('/', 'fast')

  // --- Catálogo: escolhe o primeiro NFT e adiciona ao carrinho
  await expect(page.getByTestId('catalog')).toBeVisible()
  await page.locator('[data-testid^="nft-card-"]').first().click()
  await expect(page.getByTestId('nft-detail')).toBeVisible()
  const nftName = await page.getByRole('heading', { level: 1 }).innerText()

  await page.getByTestId('add-to-cart').click()
  await expect(app.cartBadge()).toHaveText('1')

  // --- Carrinho: resumo vem da API
  await page.goto('/cart')
  await expect(page.getByTestId('cart')).toBeVisible()
  await expect(page.getByTestId('summary-total')).toContainText('ETH')
  const totalNoCarrinho = await page.getByTestId('summary-total').innerText()

  // --- Checkout exige sessão: cai no login preservando o destino
  await page.getByTestId('cart-checkout').click()
  await expect(page.getByTestId('login-form')).toBeVisible()
  expect(page.url()).toContain('redirect')

  await app.login('ana')
  await expect(page.getByTestId('checkout')).toBeVisible()

  // --- Etapa 1: dados do colecionador
  await page.getByLabel('Nome completo').fill('Ana Souza')
  await page.getByLabel('E-mail', { exact: false }).first().fill('ana@jungle.dev')
  await page.getByLabel('País').fill('Brasil')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // --- Etapa 2: carteira e rede
  await page.locator('[data-testid^="wallet-option-"]').first().click()
  await page.getByTestId('wallet-connect').click()
  await expect(page.getByTestId('wallet-status')).toContainText(/conectad/i)
  await page.getByRole('button', { name: 'Continuar' }).click()

  // --- Etapa 3: revisão com cotação da API
  await expect(page.getByTestId('quote')).toBeVisible()
  await expect(page.getByTestId('summary-total')).toContainText('ETH')

  const placeOrder = page.getByTestId('place-order')
  await expect(placeOrder).toBeEnabled()
  await placeOrder.click()

  // --- Pedido: confirmado pela API (nunca por otimismo da interface)
  await expect(page.getByTestId('order')).toBeVisible()
  const status = page.getByTestId('order-status')
  await expect(status).toHaveAttribute('data-status', 'confirmed', { timeout: 15_000 })
  await expect(page.getByTestId('order-tx-hash')).toContainText('0x')
  await expect(page.getByTestId('order-receipt')).toContainText(nftName)
  await expect(page.getByTestId('order-receipt')).toContainText(totalNoCarrinho.trim())

  // --- O item comprado sai do carrinho
  await page.goto('/cart')
  await expect(page.getByTestId('cart-empty')).toBeVisible()
})

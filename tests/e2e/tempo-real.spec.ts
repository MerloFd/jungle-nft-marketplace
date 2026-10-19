import { test, expect } from './support/app'
import { irAteRevisao } from './support/checkout'

test.describe('tempo real', () => {
  test('nft.updated no detalhe mostra o aviso de mudança', async ({ page, app }) => {
    await app.boot('/nft/nft-01', 'fast')
    await expect(page.getByTestId('nft-detail')).toBeVisible()
    await app.waitForSocket()

    await page.evaluate(() => window.__mock!.updateEdition('nft-01', 'nft-01-std', { priceEth: '0.3' }))

    await expect(page.getByTestId('nft-updated-notice')).toBeVisible()
    await expect(page.getByTestId('edition-nft-01-std')).toContainText('0.3 ETH')
    await expect(app.announced('assertive')).toContainText(/preço da edição/i)
  })

  test('evento duplicado e evento antigo não alteram a tela', async ({ page, app }) => {
    await app.boot('/nft/nft-01', 'fast')
    await expect(page.getByTestId('nft-detail')).toBeVisible()
    await app.waitForSocket()

    await page.evaluate(() => window.__mock!.updateEdition('nft-01', 'nft-01-std', { priceEth: '0.3' }))
    await expect(page.getByTestId('edition-nft-01-std')).toContainText('0.3 ETH')

    await page.evaluate(() => window.__mock!.updateEdition('nft-01', 'nft-01-std', { priceEth: '0.4' }))
    await expect(page.getByTestId('edition-nft-01-std')).toContainText('0.4 ETH')

    await page.evaluate(() => {
      window.__mock!.emitDuplicateOfLast()
      window.__mock!.emitStale('nft', 'nft-01')
    })

    await expect(page.getByTestId('edition-nft-01-std')).toContainText('0.4 ETH')
    await expect(page.getByTestId('edition-nft-01-std')).not.toContainText('0.3 ETH')
    await expect(page.getByTestId('nft-updated-notice')).toHaveCount(1)
  })

  test('mudança de preço no checkout exige aceite antes de confirmar', async ({ page, app }) => {
    await irAteRevisao(page, app, { scenario: 'price-change' })
    await app.waitForSocket()

    const notice = page.getByTestId('quote-changed-notice')
    await expect(notice).toBeVisible({ timeout: 25_000 })
    await expect(page.getByTestId('place-order')).toBeDisabled()

    await page.getByTestId('quote-accept-changes').click()

    await expect(notice).toHaveCount(0)
    await expect(page.getByTestId('place-order')).toBeEnabled()
  })

  test('pedido pendente converge para confirmado após o socket cair', async ({ page, app }) => {
    test.setTimeout(90_000)
    await irAteRevisao(page, app, { scenario: 'socket-drop' })

    await page.getByTestId('place-order').click()

    await expect(page.getByTestId('order')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('order-status')).toHaveAttribute('data-status', 'confirmed', { timeout: 40_000 })
    await expect(page.getByTestId('order-tx-hash')).toContainText('0x')
  })
})

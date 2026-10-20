import { test, expect } from './support/app'

test.describe('detalhe do NFT', () => {
  test('acesso direto por URL carrega o NFT com galeria e edições', async ({ page, app }) => {
    await app.boot('/nft/nft-01', 'fast')

    await expect(page.getByTestId('nft-detail')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Emerald Ape #042')
    await expect(page.getByTestId('nft-gallery')).toBeVisible()
    await expect(page.locator('[data-testid^="edition-"]')).not.toHaveCount(0)
    await expect(page.getByTestId('add-to-cart')).toBeEnabled()
  })

  test('NFT inexistente mostra o estado "não encontrado", não o erro genérico', async ({ page, app }) => {
    await app.boot('/nft/nao-existe', 'fast')

    await expect(page.getByTestId('nft-detail-not-found')).toBeVisible()
    await expect(page.getByTestId('nft-detail-error')).toHaveCount(0)
    await expect(page.getByTestId('nft-detail')).toHaveCount(0)
  })

  test('quantidade respeita o limite da edição escolhida', async ({ page, app }) => {
    // nft-01: Standard tem 10 disponíveis com máximo 5 por pedido; Platinum tem máximo 1.
    await app.boot('/nft/nft-01', 'fast')
    await expect(page.getByTestId('nft-detail')).toBeVisible()

    const qty = page.getByTestId('qty-input')
    const mais = page.getByTestId('qty-increase')
    await expect(qty).toHaveValue('1')
    await expect(page.getByTestId('qty-decrease')).toBeDisabled()

    for (let i = 0; i < 4; i++) await mais.click()
    await expect(qty).toHaveValue('5')
    await expect(mais).toBeDisabled()

    await page.getByTestId('edition-nft-01-plat').getByRole('radio').click()
    await expect(qty).toHaveValue('1')
    await expect(mais).toBeDisabled()
  })

  test('edição esgotada fica desabilitada e o restante continua comprável', async ({ page, app }) => {
    await app.boot('/nft/nft-01', 'fast')
    await expect(page.getByTestId('nft-detail')).toBeVisible()

    await page.evaluate(() => window.__mock!.updateEdition('nft-01', 'nft-01-std', { available: 0 }))

    const esgotada = page.getByTestId('edition-nft-01-std')
    await expect(esgotada).toHaveAttribute('data-sold-out', 'true')
    await expect(esgotada.getByRole('radio')).toBeDisabled()
    await expect(page.getByTestId('add-to-cart')).toBeEnabled()
  })
})

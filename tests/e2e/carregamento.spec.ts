import { test, expect } from './support/app'

test.describe('estados de carregamento', () => {
  test('rede lenta mostra o skeleton antes do conteúdo', async ({ page, app }) => {
    await app.boot('/?scenario=slow', 'slow')

    await expect(page.getByTestId('catalog-skeleton')).toBeVisible()
    await expect(page.getByTestId('catalog')).toHaveCount(0)

    await expect(page.getByTestId('catalog')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('catalog-skeleton')).toHaveCount(0)
  })

  test('sem conexão mostra erro com "Tentar novamente" que recupera', async ({ page, app }) => {
    await app.boot('/', 'offline')

    const erro = page.getByTestId('catalog-error')
    await expect(erro).toBeVisible({ timeout: 20_000 })
    const tentar = erro.getByRole('button', { name: /tentar novamente/i })
    await expect(tentar).toBeVisible()

    await app.setScenario('fast')
    await tentar.click()

    await expect(page.getByTestId('catalog')).toBeVisible({ timeout: 20_000 })
  })

  test('detalhe do NFT mostra o skeleton em rede lenta', async ({ page, app }) => {
    await app.boot('/nft/nft-01', 'slow')

    await expect(page.getByTestId('nft-detail-skeleton')).toBeVisible()
    await expect(page.getByTestId('nft-detail')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('nft-detail-skeleton')).toHaveCount(0)
  })
})

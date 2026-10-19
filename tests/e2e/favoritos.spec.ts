import { test, expect } from './support/app'

test.describe('favoritos', () => {
  test('favoritar sem sessão leva ao login preservando o destino', async ({ page, app }) => {
    await app.boot('/nft/nft-01', 'fast')
    await expect(page.getByTestId('nft-detail')).toBeVisible()

    await page.getByTestId('favorite-toggle').click()

    await expect(page.getByTestId('login-form')).toBeVisible()
    await expect(page).toHaveURL(/redirect=%2Fnft%2Fnft-01/)
  })

  test('favoritar com sucesso marca aria-pressed e persiste no refresh', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await app.login('ana')

    await page.goto('/nft/nft-01')
    const botao = page.getByTestId('favorite-toggle')
    await expect(botao).toHaveAttribute('aria-pressed', 'false')

    await botao.click()
    await expect(botao).toHaveAttribute('aria-pressed', 'true')

    await page.reload()
    await expect(page.getByTestId('favorite-toggle')).toHaveAttribute('aria-pressed', 'true')
  })

  test('falha ao favoritar faz rollback do otimista e avisa o usuário', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await app.login('ana')

    await page.goto('/nft/nft-01')
    const botao = page.getByTestId('favorite-toggle')
    await expect(botao).toHaveAttribute('aria-pressed', 'false')

    await app.setScenario('favorites-error')
    await botao.click()

    await expect(botao).toHaveAttribute('aria-pressed', 'true')
    await expect(botao).toHaveAttribute('aria-pressed', 'false')
    await expect(app.announced('assertive')).toContainText(/não foi possível favoritar/i)
  })
})

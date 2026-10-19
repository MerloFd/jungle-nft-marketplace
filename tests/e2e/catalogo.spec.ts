import type { Page } from '@playwright/test'
import { test, expect } from './support/app'

// No mobile os filtros vivem num Sheet; no desktop, na coluna lateral.
async function abrirFiltros(page: Page) {
  const trigger = page.getByRole('button', { name: /^filtros$/i })
  if (await trigger.first().isVisible().catch(() => false)) await trigger.first().click()
  await expect(page.getByTestId('catalog-filters')).toBeVisible()
}

async function escolherOpcao(page: Page, testId: string, label: string) {
  await page.getByTestId(testId).click()
  await page.getByRole('option', { name: label, exact: true }).click()
}

// A faixa de destaques também usa `nft-card-*`: a grade precisa ser o escopo.
const cards = (page: Page) => page.getByTestId('catalog').locator('[data-testid^="nft-card-"]')

test.describe('catálogo', () => {
  test('busca por texto filtra a lista, fica na URL e sobrevive ao refresh', async ({ page, app }) => {
    await app.boot('/', 'fast')
    await expect(page.getByTestId('catalog')).toBeVisible()
    const totalInicial = await cards(page).count()

    await page.getByTestId('catalog-search').fill('Aurora')
    await page.getByTestId('catalog-search').press('Enter')

    await expect(page).toHaveURL(/[?&]q=Aurora/)
    await expect(cards(page).first()).toBeVisible()
    // `keepPreviousData` mantém a grade anterior até a resposta nova chegar.
    await expect.poll(() => cards(page).count(), { timeout: 20_000 }).toBeLessThan(totalInicial)
    await expect(page.getByTestId('catalog-total')).toContainText(/NFTs? encontrados?/)

    await page.reload()
    await expect(page.getByTestId('catalog-search')).toHaveValue('Aurora')
  })

  test('categoria e disponibilidade combinam na URL e voltam à primeira página', async ({ page, app }) => {
    await app.boot('/?page=2', 'fast')
    await expect(page.getByTestId('catalog')).toBeVisible()

    await abrirFiltros(page)
    await page.getByTestId('filter-category-art').click()
    await expect(page).toHaveURL(/category/)
    await expect(page).not.toHaveURL(/page=2/)

    await escolherOpcao(page, 'filter-availability', 'Disponíveis')
    await expect(page).toHaveURL(/availability=available/)
    await expect(page).toHaveURL(/category/)

    await page.reload()
    await expect(page.getByTestId('catalog')).toBeVisible()
    await expect(cards(page).first()).toBeVisible()
  })

  test('ordenação por menor preço entra na URL e reordena a lista', async ({ page, app }) => {
    await app.boot('/', 'fast')
    await expect(page.getByTestId('catalog')).toBeVisible()
    const primeiro = String(await cards(page).first().getAttribute('data-testid'))

    await escolherOpcao(page, 'catalog-sort', 'Menor preço')

    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(cards(page).first()).not.toHaveAttribute('data-testid', primeiro)
  })

  test('paginação muda a página pela URL', async ({ page, app }) => {
    await app.boot('/', 'fast')
    await expect(page.getByTestId('catalog')).toBeVisible()
    const primeiro = String(await cards(page).first().getAttribute('data-testid'))

    await page.getByRole('link', { name: 'Página 2' }).click()

    await expect(page).toHaveURL(/page=2/)
    await expect(cards(page).first()).not.toHaveAttribute('data-testid', primeiro)
    await expect(page.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
  })

  test('voltar no histórico restaura o filtro anterior', async ({ page, app }) => {
    await app.boot('/', 'fast')
    await expect(page.getByTestId('catalog')).toBeVisible()

    await escolherOpcao(page, 'catalog-sort', 'Menor preço')
    await expect(page).toHaveURL(/sort=price-asc/)

    await escolherOpcao(page, 'catalog-sort', 'Nome (A-Z)')
    await expect(page).toHaveURL(/sort=name/)

    await page.goBack()
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(page.getByTestId('catalog-sort')).toContainText('Menor preço')

    await page.goBack()
    await expect(page).not.toHaveURL(/sort=/)
    await expect(page.getByTestId('catalog-sort')).toContainText('Mais recentes')
  })

  test('cenário empty mostra o estado vazio do catálogo', async ({ page, app }) => {
    await app.boot('/?scenario=empty', 'empty')
    await expect(page.getByTestId('catalog-empty')).toBeVisible()
    await expect(page.getByTestId('catalog')).toHaveCount(0)
  })

  test('cenário server-error mostra o erro e "Tentar novamente" recupera o catálogo', async ({ page, app }) => {
    await app.boot('/', 'server-error')
    const erro = page.getByTestId('catalog-error')
    await expect(erro).toBeVisible({ timeout: 20_000 })

    await app.setScenario('fast')
    await erro.getByRole('button', { name: /tentar novamente/i }).click()

    await expect(page.getByTestId('catalog')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('catalog-error')).toHaveCount(0)
  })
})

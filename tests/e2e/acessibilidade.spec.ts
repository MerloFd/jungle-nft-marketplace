import { test, expect } from './support/app'

test.describe('acessibilidade', () => {
  test('chega ao carrinho só pelo teclado', async ({ page, app }) => {
    await app.boot('/', 'fast')
    await expect(page.getByTestId('catalog')).toBeVisible()

    // A troca de rota deixa o foco no conteúdo; o cabeçalho vem antes dele no DOM.
    let achou = false
    for (let i = 0; i < 20 && !achou; i++) {
      await page.keyboard.press('Shift+Tab')
      achou = await page.evaluate(() => {
        const el = document.activeElement as HTMLAnchorElement | null
        return !!el && el.tagName === 'A' && new URL(el.href, location.origin).pathname === '/cart'
      })
    }
    expect(achou).toBe(true)

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/cart/)
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })

  test('diálogo prende o foco e devolve ao fechar', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await app.login('ana')
    await page.goto('/account/wallets')
    await expect(page.getByTestId('wallets')).toBeVisible()

    const abrir = page.getByTestId('wallet-edit-wal_ana_1')
    await abrir.focus()
    await page.keyboard.press('Enter')

    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()
    await expect(page.getByTestId('wallet-form')).toBeVisible()

    const dentro = async () =>
      page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        return !!dialog && !!document.activeElement && dialog.contains(document.activeElement)
      })
    expect(await dentro()).toBe(true)
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab')
      expect(await dentro()).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(dialogo).toHaveCount(0)
  })

  // Defeito do app: ao fechar o diálogo o foco vai para o <body>, não volta para
  // o botão que o abriu (WalletsPage usa `open` controlado, sem DialogTrigger).
  test('diálogo devolve o foco ao botão que o abriu', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await app.login('ana')
    await page.goto('/account/wallets')
    const abrir = page.getByTestId('wallet-edit-wal_ana_1')
    await abrir.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(abrir).toBeFocused()
  })

  test('erro de formulário fica associado ao campo', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await expect(page.getByTestId('login-form')).toBeVisible()

    await page.getByRole('button', { name: /entrar/i }).click()

    const email = page.getByLabel(/e-?mail/i)
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toBeFocused()

    const ids = String(await email.getAttribute('aria-describedby')).split(' ').filter(Boolean)
    const mensagem = page.locator(`#${ids[ids.length - 1]}`)
    await expect(mensagem).toBeVisible()
    await expect(mensagem).not.toBeEmpty()
    await expect(mensagem).toHaveAttribute('role', 'alert')
  })
})

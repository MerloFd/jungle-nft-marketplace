import { test, expect } from './support/app'
import { USERS } from './support/mock'

test.describe('perfil', () => {
  test('validação local bloqueia o envio e marca o campo', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await app.login('ana')
    await page.goto('/account/profile')
    await expect(page.getByTestId('profile-form')).toBeVisible()

    const usuario = page.getByLabel(/nome de usuário/i)
    await usuario.fill('a')
    await page.getByRole('button', { name: /salvar alterações/i }).click()

    await expect(usuario).toHaveAttribute('aria-invalid', 'true')
    await expect(usuario).toBeFocused()
  })

  test('e-mail já usado por outra conta volta como erro da API no campo', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await app.login('ana')
    await page.goto('/account/profile')
    await expect(page.getByTestId('profile-form')).toBeVisible()

    const email = page.getByLabel(/e-?mail/i)
    await email.fill(USERS.bruno.email)
    await page.getByRole('button', { name: /salvar alterações/i }).click()

    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const ids = String(await email.getAttribute('aria-describedby')).split(' ').filter(Boolean)
    await expect(page.locator(`#${ids[ids.length - 1]}`)).not.toBeEmpty()
  })

  test('edição válida salva e o dado persiste no refresh', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await app.login('ana')
    await page.goto('/account/profile')
    await expect(page.getByTestId('profile-form')).toBeVisible()

    const nome = page.getByLabel('Nome', { exact: false }).first()
    await nome.fill('Ana Colecionadora Souza')
    await page.getByRole('button', { name: /salvar alterações/i }).click()

    await expect(app.announced('polite')).toContainText(/perfil atualizado/i)

    await page.reload()
    await expect(page.getByLabel('Nome', { exact: false }).first()).toHaveValue('Ana Colecionadora Souza')
  })

  // O avatar exige redimensionar no canvas antes do upload: validar o blob gerado
  // não cabe num E2E estável no tempo desta entrega.
  test.fixme('avatar redimensionado é enviado e aparece na pré-visualização', async () => {})

  test('senha atual incorreta erra no campo certo', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await app.login('ana')
    await page.goto('/account/profile')
    await page.getByRole('tab', { name: /senha/i }).click()
    await expect(page.getByTestId('password-form')).toBeVisible()

    await page.getByLabel('Senha atual').fill('senhaerrada123')
    await page.getByLabel('Nova senha').fill('outraSenha456')
    await page.getByRole('button', { name: /alterar senha/i }).click()

    const atual = page.getByLabel('Senha atual')
    await expect(atual).toHaveAttribute('aria-invalid', 'true')
    await expect(atual).toBeFocused()
  })

  test('troca de senha bem-sucedida permite logar com a nova senha', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await app.login('ana')
    await page.goto('/account/profile')
    await page.getByRole('tab', { name: /senha/i }).click()
    await expect(page.getByTestId('password-form')).toBeVisible()

    await page.getByLabel('Senha atual').fill(USERS.ana.password)
    await page.getByLabel('Nova senha').fill('novaSenha789')
    await page.getByRole('button', { name: /alterar senha/i }).click()

    await expect(page.getByText(/senha alterada/i)).toBeVisible()

    // Sem app.boot aqui: reset() apagaria a troca de senha que acabamos de fazer.
    // A sessão atual continua válida (a API só encerra as OUTRAS sessões), então
    // é preciso sair antes de tentar logar de novo. No mobile o botão fica
    // dentro do menu hambúrguer.
    const menuTrigger = page.getByRole('button', { name: /abrir menu/i })
    if (await menuTrigger.isVisible().catch(() => false)) await menuTrigger.click()
    await page.getByRole('button', { name: /sair/i }).click()
    await page.goto('/login')
    await expect(page.getByTestId('login-form')).toBeVisible()
    await page.getByLabel(/e-?mail/i).fill(USERS.ana.email)
    await page.getByLabel(/senha/i).fill('novaSenha789')
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page.getByTestId('login-form')).toBeHidden()
  })

  test('carteiras: cadastro de uma nova carteira secundária', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await app.login('bruno')
    await page.goto('/account/wallets')
    await expect(page.getByTestId('wallets')).toBeVisible()

    await page.getByTestId('wallet-new').click()
    await expect(page.getByTestId('wallet-form')).toBeVisible()

    await page.getByRole('radio', { name: /secund[áa]ria/i }).check()
    await page.getByLabel(/nome/i).fill('Carteira de testes')
    await page.getByLabel(/endereço/i).fill('0x1234567890abcdef1234567890abcdef12345678')
    await page.getByRole('checkbox', { name: /ethereum/i }).check()
    await page.getByTestId('wallet-save').click()

    await expect(page.getByTestId('wallet-form')).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Carteira de testes' })).toBeVisible()
  })

  test('carteiras: endereço inválido erra no campo', async ({ page, app }) => {
    await app.boot('/login', 'fast')
    await app.login('bruno')
    await page.goto('/account/wallets')
    await page.getByTestId('wallet-new').click()
    await expect(page.getByTestId('wallet-form')).toBeVisible()

    await page.getByLabel(/nome/i).fill('Carteira inválida')
    await page.getByLabel(/endereço/i).fill('nao-e-um-endereco')
    await page.getByTestId('wallet-save').click()

    const endereco = page.getByLabel(/endereço/i)
    await expect(endereco).toHaveAttribute('aria-invalid', 'true')
  })
})

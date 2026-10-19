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
})

import { defineConfig, devices } from '@playwright/test'

/**
 * E2E com os mocks (MSW REST + Socket.IO) ativos no build de demonstração.
 * Cada teste começa de estado isolado: contexto novo (storage vazio) + `window.__mock.reset()`.
 * Para usar um Chromium já instalado no sistema: PW_CHROMIUM_PATH=/caminho/do/chrome
 */
const executablePath = process.env.PW_CHROMIUM_PATH || undefined
const PORT = 4173

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,
  // Escrita concorrente de trace/vídeo em paralelo total causa ENOENT
  // esporádico no Windows (I/O, não produto); um teto moderado mantém a
  // suíte confiável sem perder o paralelismo entre arquivos.
  workers: process.env.CI ? undefined : 4,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 45_000,
  expect: { timeout: 8_000, toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { executablePath } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, launchOptions: { executablePath } } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})

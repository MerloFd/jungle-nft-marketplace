import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { initDb } from './db'
import { initScenario } from './scenarios'
import { mockControl } from './control'

export async function startMocks() {
  initScenario()
  await initDb()
  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest(request, print) {
      const url = new URL(request.url)
      // Só avisa sobre chamadas à API; assets e HMR passam direto.
      if (url.pathname.startsWith('/api')) print.warning()
    },
    quiet: true,
  })
  window.__mock = mockControl
  window.__mockReady = true
}

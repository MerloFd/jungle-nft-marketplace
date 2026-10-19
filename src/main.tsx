import './main-fonts'
import './index.css'

/**
 * A camada de mocks é ativada por configuração (VITE_ENABLE_MOCKS) e fica
 * disponível também no build de demonstração.
 *
 * Importante: a aplicação é importada DEPOIS do MSW iniciar. O engine.io-client
 * captura `globalThis.WebSocket` no carregamento do módulo; se o socket.io-client
 * for avaliado antes do MSW, ele guarda o WebSocket original e escapa da
 * interceptação.
 */
async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { startMocks } = await import('./mocks/browser')
    await startMocks()
  }
  const { renderApp } = await import('./app')
  renderApp()
}

void bootstrap()

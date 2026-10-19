# NFT Marketplace (desafio frontend Jungle Gaming)

Enunciado: https://github.com/junglegaming/frontend-challenge (leia a seção 11, critérios e eliminatórios).

## Estado atual (19/10, 15h40)

Pronto e testado: contratos, backend simulado completo (todos os handlers REST, Socket.IO com auth,
heartbeat e reconexão, 16 cenários, window.__mock), cliente HTTP, sessão (login, logout, expiração,
merge do carrinho), cliente de tempo real, rotas com guarda, UI kit, layout, painel de cenários
(`components/app/MockPanel.tsx`), config do Playwright e script do Lighthouse (`npm run lighthouse`).

Parcial: `features/account/{api,hooks,form}.ts` e `features/catalog/api.ts` (começados, compilam; revisar).

Falta: todas as páginas em `features/*/pages` (hoje são provisórias), testes E2E em `tests/e2e`,
ajuste visual com os prints do Figma (tokens em `src/index.css`), README e docs/DECISOES.md.

## Comandos

```bash
npm install
npm run dev          # http://localhost:5173 com mocks (MSW) ligados
npm run typecheck
npm run build && npm run preview   # build de demonstração (mocks ligados), porta 4173
npm run test:e2e     # Playwright (sobe build + preview sozinho)
npm run lighthouse   # com o preview rodando na 4173: 3 medições por página e perfil, relatórios em lighthouse/reports
```

Usuários de teste: `ana@jungle.dev` / `jungle123` e `bruno@jungle.dev` / `jungle123`.
Cupons: `JUNGLE10` (10%), `WELCOME5` (5%), `EXPIRED20` (expirado), qualquer outro é inválido.
Cenários: `?scenario=<nome>` na URL (lista em `src/mocks/scenarios.ts`), ex.: `?scenario=slow`, `price-change`, `order-timeout`, `payment-declined`, `socket-drop`, `favorites-error`, `empty`, `offline`, `flaky`.

## Arquitetura

```
src/
  contracts/        Schemas Zod e tipos. Fonte única dos contratos REST e eventos. NÃO duplicar tipos.
  lib/http.ts       Axios único (token, X-Guest-Id, ApiError, eventos de sessão, request(schema, cfg)).
  lib/query-client.ts  Política de cache/retry (documentada no topo do arquivo).
  lib/query-keys.ts Fábrica de query keys. Dados privados levam userId na chave.
  lib/money.ts      Aritmética ETH com decimal.js (strings). Nunca usar number para ETH.
  realtime/         socket.io-client: dedupe por eventId e versão, reconciliação ao reconectar,
                    filtro por userId, realtimeBus + useRealtimeEvent() para a UI reagir.
  features/
    session/        Login, cadastro, logout, sessão (query ['session']), merge do carrinho do visitante.
    cart/           api.ts + hooks.ts (useCart, useAddToCart, ... já prontos).
    catalog/        search.ts (estado da URL) + pages/.
    checkout/       pages/.
    account/        search.ts (redirect) + pages/.
  components/ui/    shadcn/ui escrito à mão (button, field, dialog, sheet, select, skeleton, pagination...).
  components/layout AppHeader, AppFooter, PageContainer, SkipLink.
  routes/           TanStack Router file-based. `_authenticated` protege checkout, pedidos e conta.
  mocks/            Backend simulado: db.ts (estado + persistência localStorage + reset),
                    handlers/*.ts (REST), realtime.ts (Socket.IO via @mswjs/socket.io-binding),
                    scenarios.ts, control.ts (window.__mock para testes).
```

## Regras (o que elimina no desafio)

1. Toda chamada REST passa por `request()`/`http` de `src/lib/http.ts`, validada com schema de `@/contracts`.
2. Componentes, hooks e o cliente Axios NÃO contêm dados fictícios nem caminhos alternativos de negócio. Mocks só em `src/mocks`.
3. Eventos em tempo real só chegam via socket.io-client. Nunca simular evento chamando setter/cache na UI.
4. Compra só aparece confirmada quando a API (mock) devolve `status: 'confirmed'`.
5. Dados privados sempre com userId na query key. Logout limpa o cache (já feito em `useLogout`).
6. ETH como string decimal: usar `formatEth()` e `eth.*` de `lib/money.ts`.
7. Estados obrigatórios em toda tela com dados: carregando (Skeleton com shimmer, mesmas dimensões do conteúdo), vazio, erro com "Tentar novamente", sucesso, atualização em segundo plano.
8. Acessibilidade: labels, `Field` para erros associados, foco visível, `useAnnounce()` para feedback de mutations e mudanças em tempo real, alt nas imagens.
9. Textos de UI em português.

## Armadilhas já resolvidas (não desfazer)

- `main.tsx` importa o app DEPOIS de iniciar o MSW: o engine.io-client captura `globalThis.WebSocket` ao carregar.
- O socket usa `path: '/realtime/'` (não `/socket.io/`): o MSW remove o prefixo `/socket.io/` antes de casar a URL e capturaria o WebSocket do HMR.
- O mock envia ping (`2`) a cada 20s; sem isso o cliente cai por ping timeout.
- API publicada do binding (0.2.0) é `toSocketIo(connection)`; o README do repositório descreve uma API não publicada.

## Contratos REST (resumo; detalhes em src/mocks/handlers)

| Método e rota | Uso |
| --- | --- |
| POST /api/auth/register, /login; GET /auth/session; POST /auth/logout | Sessão |
| GET /api/nfts?q&category&minPrice&maxPrice&availability&sort&page&pageSize | Catálogo paginado |
| GET /api/nfts/featured, /api/nfts/:id | Destaques e detalhe (404 NOT_FOUND) |
| GET /api/favorites; PUT/DELETE /api/favorites/:nftId | Favoritos (auth) |
| GET/PATCH /api/cart; POST /cart/items; PATCH/DELETE /cart/items/:id; POST /cart/acknowledge; POST/DELETE /cart/coupon; POST /cart/merge | Carrinho (visitante via X-Guest-Id ou usuário) |
| POST /api/quotes {network}; POST /quotes/:id/validate; GET /quotes/:id | Cotação e revalidação |
| POST /api/orders (header Idempotency-Key); GET /orders/:id; GET /orders?idempotencyKey= | Pedido idempotente, estado e recibo |
| GET/PATCH /api/profile; POST /profile/avatar; POST /profile/password | Perfil |
| GET/POST /api/wallets; PATCH /wallets/:id; GET /wallets/connection; POST /wallets/:id/connect, /disconnect | Carteiras |

Erros: `{ error: { code, message, fields?, details? } }`. Códigos em `ErrorCode` (contracts).
Eventos: `nft.updated` e `order.updated` com `{ eventId, resource, version, occurredAt, data }`.

## window.__mock (testes e demonstração)

`reset()`, `setScenario(nome)`, `setLatencyFactor(n)`, `expireSessions()`,
`updateEdition(nftId, editionId, { priceEth?, available? })` (REST + emite nft.updated),
`emitDuplicateOfLast()`, `emitStale('nft'|'order', id)`, `dropSockets()`, `connectedPeers()`,
`disconnectWallet()`, `state()`. `window.__realtimeStatus` expõe o status do socket.

## Divisão para agentes em paralelo (cada um só mexe nas suas pastas)

- **Catálogo**: `features/catalog/**`, `routes/index.tsx`, `routes/nft.$nftId.tsx`. Home com destaques, busca, filtros combináveis, ordenação e paginação na URL (mudar filtro volta à página 1), skeletons, vazio, erro. Detalhe com galeria, edições, quantidade com limite, favoritos com atualização otimista e rollback, adicionar ao carrinho (`useAddToCart`), NFT inexistente, edição esgotada, aviso quando chega `nft.updated`.
- **Carrinho e checkout**: `features/cart/pages/**`, `features/checkout/**`, rotas de checkout e pedido. Carrinho com quantidades, remoção, cupom, resumo da API, avisos de preço/estoque (`notice`). Checkout: dados do colecionador, carteira + rede + conectar/recusa/desconexão, revisão, revalidação da cotação, nova confirmação se mudou, Idempotency-Key persistida em sessionStorage, botão bloqueado contra clique repetido, retry com a mesma chave após timeout, pendente/confirmado/recusado com recuperação após refresh/reconexão, recibo do snapshot.
- **Conta**: `features/account/**`, rotas de login, cadastro, perfil e carteiras. Validação com os schemas dos contratos + erros da API por campo (409 de cadastro), retorno ao `redirect`, aviso de sessão expirada, perfil com avatar (redimensionar no canvas para <= 256px antes de enviar) e senha, carteiras principal e secundária.
- **Testes**: `tests/e2e/**`. Os 12 cenários da seção 9 do enunciado, regressão visual de início, detalhe, carrinho e pagamento.

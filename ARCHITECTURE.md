# Arquitetura

Documento exigido pelo enunciado: contratos REST, eventos, política de sessão, estratégia de
cache e invalidação, reconciliação após reconexão e limitações conhecidas.

Para a explicação didática das decisões (por que idempotência, por que versão em evento, por que
ETH como string), veja [docs/DECISOES.md](docs/DECISOES.md).

---

## 1. Visão geral

```
src/
  contracts/     Schemas Zod + tipos. Fonte única da verdade de REST e eventos.
  lib/           http (Axios único) · query-client · query-keys · money (ETH em decimal.js)
  realtime/      socket.io-client: dedupe, versionamento, reconciliação, barramento para a UI
  features/      session · catalog · cart · checkout · account
                 cada uma: api.ts → hooks.ts → components/ → pages/
  components/    ui/ (shadcn escrito à mão) · layout/ · app/
  routes/        TanStack Router file-based; _authenticated protege checkout, pedido e conta
  mocks/         backend simulado: db · handlers/*.ts (REST) · realtime.ts (Socket.IO) · scenarios
```

**A dependência só aponta para dentro.** `features` conhece `lib` e `contracts`; `lib` não conhece
`features`; nenhuma feature importa componentes de outra, apenas hooks públicos (`useSession`,
`useAddToCart`, `useWallets`). Foi essa regra que permitiu implementar catálogo, carrinho/checkout e
conta em paralelo, com conjuntos de escrita disjuntos.

### Onde cada tecnologia da stack participa

| Tecnologia | Onde, concretamente |
| --- | --- |
| React 19 + TypeScript | toda a interface; `strict`, sem `any` e sem `@ts-ignore` |
| TanStack Router | `src/routes/` file-based; `validateSearch` com Zod; `beforeLoad` com guarda de sessão |
| TanStack Query | todo estado de servidor; política em `src/lib/query-client.ts` |
| Axios | instância única em `src/lib/http.ts`; interceptores de token, visitante e erro |
| Zod | `src/contracts/` valida **toda** resposta na borda e também valida os formulários |
| Socket.IO | `src/realtime/`; cliente real falando com o binding do MSW |
| Tailwind CSS v4 | tokens em `src/index.css` (`@theme inline`), lidos do Figma |
| shadcn/ui | `src/components/ui/`, escrito à mão sobre Radix |
| MSW | `src/mocks/`, ativado por `VITE_ENABLE_MOCKS` |
| Playwright | `tests/e2e/`, projetos desktop (1440) e mobile (390) |
| Lighthouse | `lighthouse/run.mjs`, 3 medições por página e perfil |

---

## 2. Contratos REST

Base: `/api`. Toda chamada passa por `request(schema, config)` de `src/lib/http.ts`, que valida a
resposta com o schema do contrato antes de ela chegar ao cache. Uma resposta fora do contrato vira
erro, e não um dado torto dentro do cache.

### Sessão

| Método e rota | Entrada | Saída |
| --- | --- | --- |
| `POST /auth/register` | `RegisterInput` | `Session` (409 `EMAIL_TAKEN` com `fields`) |
| `POST /auth/login` | `LoginInput` | `Session` (401 `INVALID_CREDENTIALS`) |
| `GET /auth/session` | sem corpo | `SessionInfo` (401 `SESSION_EXPIRED`) |
| `POST /auth/logout` | sem corpo | `{ ok: true }` |

### Catálogo

| Método e rota | Observações |
| --- | --- |
| `GET /nfts?q&category&minPrice&maxPrice&availability&sort&page&pageSize` | paginado; os mesmos nomes valem na URL da aplicação |
| `GET /nfts/featured` | destaques da home |
| `GET /nfts/:id` | `NftDetail`; 404 `NOT_FOUND` |
| `GET /nfts/facets` | contagem por categoria e faixa de preço, agregadas do catálogo inteiro (não filtrado); alimenta a barra de filtros sem número inventado em componente |
| `GET /favorites` · `PUT/DELETE /favorites/:nftId` | exige sessão |

### Carrinho

`GET /cart` · `PATCH /cart` (rede) · `POST /cart/items` · `PATCH/DELETE /cart/items/:id` ·
`POST /cart/acknowledge` · `POST/DELETE /cart/coupon` · `POST /cart/merge`.

Visitante é identificado pelo cabeçalho `X-Guest-Id`; usuário, pelo `Authorization`. **Toda mutation
devolve o carrinho inteiro**, incluindo o `summary`. O cliente nunca recalcula valores.

### Cotação e pedido

| Método e rota | Papel |
| --- | --- |
| `POST /quotes` | congela um snapshot de preços (`Quote` com `fingerprint`) |
| `POST /quotes/:id/validate` | diz se ainda vale e devolve as `changes` |
| `GET /quotes/:id` | releitura |
| `POST /orders` (cabeçalho `Idempotency-Key`) | cria o pedido a partir de `quoteId` + `quoteFingerprint` |
| `GET /orders/:id` | estado e recibo |
| `GET /orders?idempotencyKey=` | recuperação após timeout |

### Conta

`GET/PATCH /profile` · `POST /profile/avatar` · `POST /profile/password` ·
`GET/POST /wallets` · `PATCH /wallets/:id` · `GET /wallets/connection` ·
`POST /wallets/:id/connect` · `POST /wallets/:id/disconnect`.

### Erros

Formato único: `{ error: { code, message, fields?, details? } }`. Os códigos são o enum `ErrorCode`
do contrato. `src/lib/http.ts` normaliza tudo em `ApiError`, com `status`, `code`, `fields`,
`isNetworkError`, `isTimeout` e a propriedade derivada `isTransient`, que é quem decide o retry.

`fields` é o que permite mostrar o erro **no campo certo** do formulário (por exemplo, o 409 de
cadastro cai no campo de e-mail), em vez de um aviso genérico solto na tela.

---

## 3. Eventos (Socket.IO)

Transporte: `websocket`, caminho **`/realtime/`**. Autenticação no handshake (`auth.token`).

```ts
// forma comum
{ eventId, type, resource: { type, id }, version, occurredAt, data, userId? }
```

| Evento | Carga | Quem recebe |
| --- | --- | --- |
| `nft.updated` | preço mínimo, disponibilidade e edições afetadas | todos |
| `order.updated` | status, hash da transação, motivo da recusa | **só o dono** (`userId` no evento, filtrado no cliente) |

### Garantias do cliente (`src/realtime/realtime.ts`)

1. **Idempotência**: `eventId` já visto é descartado.
2. **Ordem**: cada recurso guarda a última `version` aplicada; evento com versão menor ou igual é
   ignorado. Respostas REST também registram a versão (`noteResourceVersion`), então um evento
   atrasado não sobrescreve um dado mais novo lido por HTTP.
3. **Isolamento**: o socket é recriado a cada troca de sessão e o registro de versões é zerado;
   `order.updated` de outro `userId` é descartado.
4. **A interface não fabrica evento**: componentes apenas **leem** o barramento
   (`useRealtimeEvent`) para anunciar e avisar. Nenhum componente escreve status de pedido no cache.

---

## 4. Sessão

- O token fica em `localStorage` (`session:token`) para sobreviver a refresh; a **fonte da verdade do
  usuário** é a query `['session']`.
- Login e cadastro gravam o token, incorporam o carrinho de visitante (`POST /cart/merge`),
  rotacionam o `X-Guest-Id` e limpam o cache privado anterior. Se o usuário anterior era outro, o
  cache inteiro é descartado.
- Expiração: qualquer 401 `SESSION_EXPIRED` com token emite um evento de sessão; o `SessionWatcher`
  no root encerra a sessão local e, se a rota for privada, navega para `/login` com `redirect` e
  `reason=expired`.
- Logout: `queryClient.clear()` e o socket reconecta como anônimo.

**Isolamento entre usuários** (critério eliminatório): toda chave privada carrega o `userId`:
`['user', <userId>, 'favorites' | 'profile' | 'wallets' | 'order', …]` e
`['cart', <userId | 'guest'>]`. Sem isso, trocar de conta mostraria dados da anterior.

---

## 5. Cache, retry e invalidação

Política em `src/lib/query-client.ts`:

| Decisão | Valor | Porquê |
| --- | --- | --- |
| `staleTime` padrão | 30s | o catálogo muda pouco e os eventos mantêm preço e estoque frescos |
| dados privados | `staleTime: 0` | perfil e carteiras precisam refletir a última escrita |
| `gcTime` | 5 min | |
| retry de query | até 2x, **só** em erro transitório (rede, timeout, 5xx), com backoff exponencial | repetir um 4xx só reproduz o mesmo erro |
| retry de mutation | nenhum automático | repetir uma escrita sem chave de idempotência pode duplicar efeito |
| `refetchOnWindowFocus` e `refetchOnReconnect` | ligados | |

**Invalidação após mutation**: as mutations de carrinho **substituem** o cache com o carrinho
devolvido pela API (`setQueryData`) em vez de invalidar, porque a resposta já é o estado novo e completo,
então não há ida e volta extra nem janela de inconsistência. Favoritos usam atualização otimista com
rollback (`onMutate` guarda o snapshot, `onError` restaura, `onSettled` invalida).

**Corridas**: as queries do catálogo recebem o `signal` do TanStack Query, então trocar de filtro
cancela a requisição anterior e a resposta de uma busca antiga não pode sobrescrever a atual. A
paginação usa `keepPreviousData` para não piscar entre páginas.

---

## 6. Reconciliação após reconexão

Enquanto o socket está caído, eventos se perdem. Ao reconectar, o cliente **não** tenta recuperar o
histórico: invalida todas as queries ativas (`invalidateQueries({ type: 'active' })`) e deixa o REST
dizer qual é o estado atual. É mais simples e mais correto do que confiar numa fila de eventos
perdidos.

Além disso, a página do pedido mantém um `refetchInterval` curto **enquanto o status é `pending`**,
como rede de segurança atrás do socket: mesmo com o tempo real indisponível, o pedido converge.

---

## 7. Compra: idempotência e segurança dos valores

1. **Cotação**: entrar na revisão cria uma `Quote`, um snapshot com `fingerprint` (hash de linhas,
   cupom e rede).
2. **Revalidação**: antes de todo envio, `POST /quotes/:id/validate`. Se mudou, a interface mostra as
   diferenças e **exige um novo aceite explícito**. Nunca se envia um valor que o usuário não viu.
3. **Chave de idempotência**: gerada uma vez por *intenção de compra*, identificada pelo par
   `(quoteId, fingerprint)`, e persistida em `sessionStorage`. Cotação nova significa chave nova.
4. **Clique repetido**: barrado por uma ref síncrona (antes do re-render) e pelo `disabled` do botão.
5. **Timeout**: sem resposta, o cliente **não assume falha**. Consulta `GET /orders?idempotencyKey=`;
   se o pedido existe, adota; se não existe, reenvia **com a mesma chave**.
6. **Confirmação**: a interface só mostra "confirmado" quando a API devolve `status: 'confirmed'`.
   O recibo lê exclusivamente o snapshot do pedido, nunca o carrinho atual.

---

## 8. Camada de mocks

Ativada por configuração (`VITE_ENABLE_MOCKS=true`), ligada no desenvolvimento e no build de
demonstração.

- REST: `src/mocks/handlers/*.ts` sobre MSW.
- Tempo real: `src/mocks/realtime.ts` usando `@mswjs/socket.io-binding`.
- Estado: `src/mocks/db.ts`, com seed determinístico e persistência em `localStorage`.
- Cenários: `src/mocks/scenarios.ts` (16), selecionáveis por `?scenario=`, pelo painel de cenários ou
  por `window.__mock.setScenario()`. A latência "variável" usa um PRNG semeado: a mesma sequência de
  requisições produz os mesmos atrasos, então os testes são reprodutíveis.
- Controle para testes: `window.__mock` (`reset`, `setScenario`, `expireSessions`, `updateEdition`,
  `emitDuplicateOfLast`, `emitStale`, `dropSockets`, `connectedPeers`, `state`).

### Limitações do transporte Socket.IO sobre MSW

1. **O caminho é `/realtime/`, não `/socket.io/`.** O MSW remove o prefixo `/socket.io/` antes de
   casar a URL, e isso faria o WebSocket do HMR do Vite ser capturado junto.
2. **A aplicação é importada depois de o MSW iniciar** (`src/main.tsx`). O `engine.io-client` captura
   `globalThis.WebSocket` no carregamento do módulo; se o socket.io-client fosse avaliado antes, ele
   guardaria o WebSocket original e escaparia da interceptação.
3. **O heartbeat é manual**: o mock envia o ping do protocolo a cada 20s; sem isso o cliente cai por
   ping timeout.
4. A API publicada do binding (0.2.0) é `toSocketIo(connection)`; o README do repositório documenta
   uma API que ainda não foi publicada.
5. Sem servidor real não há difusão entre abas: cada aba tem o seu próprio mundo simulado.

---

## 9. Acessibilidade

HTML semântico, um `h1` por página, `Field` associando rótulo, erro (`role="alert"`), `aria-invalid`
e `aria-describedby`, foco visível preservado, foco movido para o conteúdo a cada navegação e para o
primeiro campo inválido a cada submissão, diálogos com foco preso e devolvido (Radix), regiões
`aria-live` (`useAnnounce`) para mutations e mudanças em tempo real, skeletons com shimmer nas mesmas
dimensões do conteúdo (sem salto de layout) e `prefers-reduced-motion` desligando animações.

---

## 10. Limitações conhecidas

- Não há backend real: tudo é simulado no navegador. A "blockchain" é uma função que sorteia um hash.
- Parâmetros de array na URL são serializados em JSON pelo TanStack Router
  (`?category=%5B%22art%22%5D`). Funciona de ida e de volta, mas é menos legível que `?category=art`.
- O avatar é redimensionado no cliente e trafega como data URL; não há serviço de imagens.
- A regressão visual depende das fontes instaladas na máquina; em outro ambiente as baselines podem
  precisar de `--update-snapshots`.

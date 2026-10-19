# NFT Marketplace: desafio frontend Jungle Gaming

Marketplace de NFTs em React + TypeScript, com backend simulado (REST e tempo real), fluxo de compra
completo com idempotência, estados de carregamento/vazio/erro em toda tela com dados e testes E2E.

- **Arquitetura e contratos**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Decisões explicadas** (material de estudo): [docs/DECISOES.md](docs/DECISOES.md)
- **Tokens lidos do Figma**: [docs/figma/TOKENS.md](docs/figma/TOKENS.md)
- **Convenção de seletores e estados**: [docs/TESTIDS.md](docs/TESTIDS.md)
- **A stack explicada para defender**: [docs/STACK.md](docs/STACK.md)
- **Especificações por feature**: [docs/ESPECIFICACOES.md](docs/ESPECIFICACOES.md)

---

## Como rodar

```bash
npm install
npm run dev          # http://localhost:5173 com os mocks ligados
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | desenvolvimento na 5173, mocks ligados |
| `npm run typecheck` | TypeScript estrito, sem emitir |
| `npm run build` | build de produção (mocks incluídos, é uma demonstração) |
| `npm run preview` | serve o build na 4173 |
| `npm run test:e2e` | Playwright; sobe build e preview sozinho |
| `npm run test:e2e:report` | abre o relatório HTML da última execução |
| `npm run lighthouse` | com o preview na 4173: 3 medições por página e perfil |

### Variáveis de ambiente

| Variável | Valor | Efeito |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` / `false` | liga a camada de mocks (MSW + Socket.IO). Já vem `true` em `.env.development` e `.env.production` |

Não há API real: com `VITE_ENABLE_MOCKS=false` a aplicação sobe, mas toda chamada falha. O valor
`true` no build de produção é intencional: é o que faz a demonstração publicada funcionar.

### Credenciais de teste

| E-mail | Senha |
| --- | --- |
| `ana@jungle.dev` | `jungle123` |
| `bruno@jungle.dev` | `jungle123` |

Os dois usuários existem para demonstrar o isolamento de dados: favoritos, carrinho, carteiras e
pedidos de um não aparecem para o outro.

### Cupons

| Código | Efeito |
| --- | --- |
| `JUNGLE10` | 10% de desconto |
| `WELCOME5` | 5% de desconto |
| `EXPIRED20` | expirado (erro `COUPON_EXPIRED`) |
| qualquer outro | inválido (erro `COUPON_INVALID`) |

---

## Stack e onde cada tecnologia participa

| Tecnologia | Papel concreto no projeto |
| --- | --- |
| **React 19 + TypeScript** | toda a interface, em modo estrito, sem `any` e sem `@ts-ignore` |
| **TanStack Router** | rotas por arquivo em `src/routes/`; `validateSearch` com Zod põe busca, filtros, ordenação e página na URL; `beforeLoad` protege checkout, pedido e conta |
| **TanStack Query** | todo o estado de servidor: cache, revalidação, retry seletivo, atualização otimista, invalidação por evento |
| **Axios** | instância única em `src/lib/http.ts` com token, `X-Guest-Id`, normalização de erro e detecção de sessão expirada |
| **Zod** | `src/contracts/` é a fonte única de tipos: valida toda resposta na borda e também os formulários |
| **Socket.IO** | `src/realtime/`: cliente real, com dedupe por evento e versão, filtro por usuário e reconciliação na reconexão |
| **Tailwind CSS v4** | tokens em `src/index.css` (`@theme inline`), lidos do Figma; nenhum componente usa cor literal |
| **shadcn/ui** | `src/components/ui/`, escrito à mão sobre Radix (diálogo, sheet, select, tabs, campo, paginação…) |
| **MSW** | `src/mocks/`: REST + Socket.IO, 16 cenários determinísticos, ativado por configuração |
| **Playwright** | `tests/e2e/`, projetos desktop (1440×900) e mobile (390×844) |
| **Lighthouse** | `lighthouse/run.mjs`: 3 medições por página e perfil, com mediana e metas versionadas |
| **decimal.js** | aritmética de ETH sem perda de precisão (`src/lib/money.ts`) |

---

## Contratos REST

Resumo. A tabela completa, com entradas, saídas e códigos de erro, está em
[ARCHITECTURE.md](ARCHITECTURE.md#2-contratos-rest).

| Grupo | Rotas |
| --- | --- |
| Sessão | `POST /auth/register` · `POST /auth/login` · `GET /auth/session` · `POST /auth/logout` |
| Catálogo | `GET /nfts` (busca, filtros, ordenação, paginação) · `GET /nfts/featured` · `GET /nfts/:id` |
| Favoritos | `GET /favorites` · `PUT/DELETE /favorites/:nftId` |
| Carrinho | `GET/PATCH /cart` · `POST /cart/items` · `PATCH/DELETE /cart/items/:id` · `POST /cart/acknowledge` · `POST/DELETE /cart/coupon` · `POST /cart/merge` |
| Cotação | `POST /quotes` · `POST /quotes/:id/validate` · `GET /quotes/:id` |
| Pedido | `POST /orders` (`Idempotency-Key`) · `GET /orders/:id` · `GET /orders?idempotencyKey=` |
| Conta | `GET/PATCH /profile` · `POST /profile/avatar` · `POST /profile/password` · `GET/POST /wallets` · `PATCH /wallets/:id` · `GET /wallets/connection` · `POST /wallets/:id/connect` · `POST /wallets/:id/disconnect` |

Erros têm formato único: `{ error: { code, message, fields?, details? } }`. O campo `fields` é o que
permite mostrar a mensagem no campo certo do formulário.

**Eventos**: `nft.updated` (preço e disponibilidade, para todos) e `order.updated` (status do pedido,
só para o dono). Ambos carregam `eventId` e `version`.

---

## Cache, retry e sincronização

| Decisão | Valor | Porquê |
| --- | --- | --- |
| `staleTime` padrão | 30s | o catálogo muda pouco e os eventos mantêm preço e estoque frescos |
| dados privados | 0 | perfil e carteiras refletem a última escrita |
| retry de query | até 2x, só em erro transitório (rede, timeout, 5xx), backoff exponencial | repetir um 4xx só reproduz o mesmo erro |
| retry de mutation | nenhum automático | só o pedido reenvia, e sempre com a mesma `Idempotency-Key` |
| após mutation de carrinho | a resposta substitui o cache | a API já devolve o carrinho completo e o resumo correto |
| favoritos | otimista com rollback | é a interação em que a latência mais incomoda |
| corridas | `signal` do Query cancela a requisição anterior | resposta de busca antiga não sobrescreve a atual |
| reconexão | invalida as queries **ativas** | o REST diz o estado atual; não se tenta recuperar eventos perdidos |
| pedido pendente | polling curto além do socket | o tempo real deixa de ser ponto único de falha |

---

## Cenários de mock

Seleção por `?scenario=<nome>` na URL, pelo painel de cenários (canto inferior esquerdo) ou por
`window.__mock.setScenario()`.

| Cenário | O que exercita |
| --- | --- |
| `default` | latência realista (150–400ms) |
| `fast` | sem latência (usado pelos testes) |
| `slow` | 2,5s por requisição, exercita os skeletons |
| `variable` | latência de 100ms a 2s, gera respostas fora de ordem |
| `empty` | catálogo sem resultados |
| `offline` | sem conexão com a API |
| `server-error` | catálogo responde 500 |
| `flaky` | a 1ª consulta falha (503), a nova tentativa funciona |
| `favorites-error` | falha ao favoritar, com rollback do otimista |
| `session-expired` | sessão expira na próxima requisição autenticada |
| `price-change` | preço muda durante o checkout |
| `sold-out` | edição esgota durante o checkout |
| `order-timeout` | timeout após criar o pedido, com recuperação por idempotência |
| `payment-declined` | pagamento recusado |
| `wallet-rejects` | carteira recusa a conexão |
| `socket-drop` | conexão em tempo real cai com o pedido pendente |

A latência variável usa um PRNG semeado, reiniciado no reset: a mesma sequência de requisições produz
os mesmos atrasos. Os cenários são reprodutíveis, não aleatórios.

### `window.__mock`

Superfície de controle usada pelos testes e pela demonstração:

| Função | Efeito |
| --- | --- |
| `reset()` | restaura o seed (catálogo, usuários, carrinhos, pedidos, carteiras) |
| `setScenario(nome)` · `setLatencyFactor(n)` | troca o cenário / multiplica a latência |
| `expireSessions()` | expira todas as sessões agora |
| `updateEdition(nftId, editionId, { priceEth?, available? })` | muda preço/estoque no REST **e** emite `nft.updated` |
| `emitDuplicateOfLast()` | reemite o último evento (testa dedupe) |
| `emitStale('nft'\|'order', id)` | emite um evento com versão antiga (testa ordenação) |
| `dropSockets()` · `connectedPeers()` | derruba as conexões / conta as abertas |
| `disconnectWallet()` | desconecta a carteira |
| `state()` | estado atual do backend simulado |

`window.__realtimeStatus` expõe o estado do socket.

### Reset

`window.__mock.reset()` no console, ou o botão **Restaurar** no painel de cenários. O reset restaura
o seed por completo (catálogo, usuários, carrinhos, pedidos e carteiras) e zera o registro de
eventos do tempo real. Todo teste E2E começa por ele.

---

## Como reproduzir os fluxos de falha

Cada roteiro abaixo leva menos de um minuto e começa com a aplicação rodando (`npm run dev`).

### Pagamento recusado
1. Abra `/?scenario=payment-declined`.
2. Entre com `ana@jungle.dev` / `jungle123`, adicione um NFT ao carrinho e vá até o fim do checkout.
3. O pedido entra em `pending` e a API o recusa: a página mostra o motivo e o **carrinho continua
   intacto** para tentar de novo.

### Timeout com recuperação por idempotência
1. Abra `/?scenario=order-timeout` e percorra o checkout até "Confirmar compra".
2. A primeira resposta demora mais que o timeout do cliente. A interface não assume falha: avisa que
   está verificando e consulta `GET /orders?idempotencyKey=`.
3. O pedido aparece **uma única vez**. Confira em `window.__mock.state().orders`.

### Clique repetido
No mesmo checkout, clique duas vezes seguidas em "Confirmar compra". O botão bloqueia a segunda
chamada antes do re-render; `window.__mock.state().orders` continua com um pedido só.

### Preço mudando durante o checkout
1. Abra `/?scenario=price-change` e vá até a revisão.
2. Chega um `nft.updated` pelo socket: a cotação é revalidada, as diferenças aparecem e **o botão de
   confirmar fica bloqueado** até você aceitar os valores novos.
3. Para disparar manualmente, em qualquer cenário:
   `window.__mock.updateEdition('nft-01', 'ed-01-1', { priceEth: '9.5' })`.

### Evento duplicado ou antigo
Com o detalhe de um NFT aberto: `window.__mock.emitDuplicateOfLast()` (o aviso **não** se repete) e
`window.__mock.emitStale('nft', 'nft-01')` (a tela **não** regride para o valor antigo).

### Queda de conexão com pedido pendente
1. Abra `/?scenario=socket-drop` e finalize uma compra.
2. O socket cai antes da confirmação e o evento se perde. O pedido converge assim mesmo, pelo
   polling de segurança e pela reconciliação na reconexão.
3. Manualmente: `window.__mock.dropSockets()`; acompanhe por `window.__realtimeStatus`.

### Sessão expirada no meio do fluxo
Autenticado, rode `window.__mock.expireSessions()` e faça qualquer ação autenticada. A sessão é
encerrada, você volta ao login com o aviso de expiração, e ao entrar de novo retoma o destino
original pelo parâmetro `redirect`.

### Falha ao favoritar, com rollback
Em `/?scenario=favorites-error`, favorite um NFT no detalhe. O coração muda na hora (otimista) e
**volta ao estado anterior** quando a API falha, com mensagem de erro.

### Catálogo lento, vazio, com erro e recuperação
`?scenario=slow` (skeletons com as dimensões do conteúdo), `?scenario=empty` (estado vazio),
`?scenario=offline` (erro com "Tentar novamente") e `?scenario=flaky` (a primeira consulta falha e o
botão de nova tentativa recupera).

### Cupom inválido e expirado
No carrinho, aplique `EXPIRED20` (expirado) ou qualquer código inexistente (inválido). O erro aparece
**associado ao campo**, não como aviso solto.

### Conflito de cadastro
Em `/register`, cadastre-se com `ana@jungle.dev`. A API responde 409 e o erro cai **no campo de
e-mail**, com o foco indo para ele.

---

## Limitações do transporte Socket.IO sobre MSW

1. **O caminho é `/realtime/`, não `/socket.io/`.** O MSW remove o prefixo `/socket.io/` antes de
   comparar a URL e capturaria junto o WebSocket do HMR do Vite.
2. **A aplicação é importada depois de o MSW iniciar.** O `engine.io-client` captura
   `globalThis.WebSocket` ao carregar o módulo; avaliado antes do MSW, ele guardaria o WebSocket
   original e escaparia da interceptação, e o socket falharia em silêncio.
3. **O heartbeat é manual**: o mock envia o ping do protocolo a cada 20s, senão o cliente cai por
   ping timeout.
4. A API publicada do `@mswjs/socket.io-binding` (0.2.0) é `toSocketIo(connection)`; o README do
   repositório documenta uma API ainda não publicada.
5. Sem servidor real não há difusão entre abas: cada aba tem o seu próprio mundo simulado.

---

## Testes

```bash
npm run test:e2e              # sobe build + preview e roda tudo
npx playwright test --project=desktop
npx playwright test --project=mobile
```

Cada teste começa por `app.boot(rota, cenário)`, que chama `window.__mock.reset()` e garante estado
isolado. As fixtures (`tests/e2e/support/app.ts`) expõem `login`, `addFirstNftToCart`,
`waitForSocket`, `waitForIdle`, `cartBadge` e `announced`.

---

## Resultados do Lighthouse

Metas do enunciado (mediana de 3 medições): desempenho ≥ 90, acessibilidade ≥ 95, boas práticas ≥ 95,
SEO ≥ 90.

**Condições**: Lighthouse 13.5.0, HeadlessChrome 155, Windows 10.0.26300, 12 CPUs, Node v24.21.0.
Build otimizado (`vite build` + `vite preview`), cenário de mocks `default`, 3 execuções por página e
perfil. Relatórios HTML e JSON de cada execução em `lighthouse/reports/`.

| Página | Perfil | Performance | A11y | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| início | mobile | 87 | 100 | 100 | 100 | 3784ms | 0.037 | 48ms |
| detalhe | mobile | 89 | 100 | 100 | 100 | 3460ms | 0.000 | 45ms |
| início | desktop | 99 | 100 | 100 | 100 | 898ms | 0.020 | 0ms |
| detalhe | desktop | 86 | 100 | 100 | 100 | 1981ms | 0.016 | 10ms |

**Acessibilidade, boas práticas e SEO atingem 100 nas quatro medições.**

### Por que performance fica abaixo de 90 em três medições

A causa é o próprio requisito de entrega. O enunciado exige que a versão publicada funcione com os
mocks e o tempo real, então o build de demonstração carrega a camada MSW (≈483kB, 177kB comprimido) e
**espera o worker iniciar antes de renderizar qualquer coisa**. A aplicação é importada só depois do
`await startMocks()`, pela razão descrita em [docs/DECISOES.md](docs/DECISOES.md#6-por-que-a-aplicação-carrega-depois-do-msw).
Isso empurra o LCP para depois do boot do service worker, e o efeito é maior no perfil mobile, que o
Lighthouse mede com CPU e rede limitadas.

O que isso **não** é: não é peso de imagem (CLS fica em 0.000–0.037, bem abaixo do limite) nem
bloqueio de thread (TBT máximo de 48ms, contra um limite de 200ms). O custo está concentrado no
tempo até a primeira pintura, e vem do mock.

Num cenário com API real, a camada MSW sairia do bundle de produção e esses números subiriam sem
nenhuma mudança no código da aplicação. Nenhuma otimização foi feita exclusivamente para a auditoria:
as medições carregam as mesmas imagens, fontes e funcionalidades da entrega.

---

## O que ficou de fora, e por quê

**Composição visual ainda não é fiel ao Figma.** Os tokens (paleta, escala tipográfica, raios e
grade) foram lidos do arquivo e aplicados, e a identidade visual está correta. O **arranjo** das
telas não: o Figma tem um hero com imagem e navegação própria (Início/Mercado/Criadores/Aprenda com
busca), cards reduzidos a imagem, nome e preço, e uma barra lateral de filtros com contagem por
coleção e faixa de preço com slider. A implementação entrega a mesma informação num arranjo próprio.
Foi uma escolha de prioridade: com o prazo apertado, preferi garantir os critérios eliminatórios
(testes E2E executáveis, compra confirmada pela API, isolamento entre usuários) a aproximar pixels.

**A família tipográfica não foi confirmada.** O arquivo do Figma amarra a fonte a uma variável
`font/family` que o modo de visualização não resolve. A interface é monoespaçada no desenho, e o
projeto usa Space Mono, a correspondência mais próxima disponível. Trocar é alterar uma linha em
`src/index.css`.

**Cores de estado são inferência.** O Figma não define erro, sucesso e aviso. Os valores em uso foram
escolhidos para conviver com a paleta âmbar e passar nos limites de contraste. Estão marcados como
**INFERIDO** em [docs/figma/TOKENS.md](docs/figma/TOKENS.md).

**Performance abaixo da meta em três medições**, pela razão analisada na seção anterior.

**Sem backend real.** Tudo é simulado no navegador; a "blockchain" é uma função que sorteia um hash.

---

## Uso de IA no desenvolvimento

O projeto foi desenvolvido com Claude Code em um fluxo orientado a especificação. O método está
documentado em [docs/ESPECIFICACOES.md](docs/ESPECIFICACOES.md), com a especificação de cada feature
e a fronteira de escrita de cada frente.

**O ciclo foi especificar, congelar, paralelizar, verificar.**

*Especificar.* Três artefatos governam o código e existem em commits anteriores a ele:
`src/contracts/` (schemas Zod que são a fonte única de tipos entre transporte, estado e interface),
`CLAUDE.md` (arquitetura, regras eliminatórias e armadilhas conhecidas) e `docs/TESTIDS.md`
(seletores e os cinco estados obrigatórios de toda tela com dados).

*Congelar.* Durante a implementação, nada em `contracts/`, `lib/`, `mocks/`, `realtime/` ou
`components/ui/` podia mudar. Essa é a condição que torna a paralelização segura: o que duas frentes
leem em comum não se move enquanto elas trabalham.

*Paralelizar.* Catálogo, carrinho/checkout e conta foram implementados ao mesmo tempo, cada um
escrevendo apenas nas próprias pastas. Conjuntos de escrita disjuntos eliminam conflito de edição
por construção, não por convenção.

*Verificar em série.* `typecheck`, `build`, `lint` e E2E só depois que todas as frentes terminaram,
porque durante a execução o disco contém arquivos pela metade das outras.

**O que foi revisado em vez de aceito.** Cinco defeitos reais apareceram e foram corrigidos à mão,
cada um com a razão na mensagem de commit: o mock nunca liquidava um pedido pendente após refresh
(a confirmação era agendada com `setTimeout` em memória, o que tornava impossível o cenário
obrigatório de recuperação); o cabeçalho estourava 19px em 768px; o merge do carrinho de visitante
publicava a sessão antes de terminar, e um reload nessa janela perdia os itens; o diálogo de
carteiras não devolvia o foco ao botão que o abriu; e sair da conta deixava a tela privada montada.

Uma decisão foi revertida por leitura do contrato: a especificação inicial mandava avisar que a
carteira principal seria rebaixada, mas a API responde `409 CONFLICT` em vez de rebaixar. A interface
passou a refletir o que a API faz, em vez de a API ser mudada para justificar a interface.

**Os tokens visuais foram lidos, não estimados.** Cores, escala tipográfica, raios e grade vieram do
painel de propriedades do Figma, como texto. [docs/figma/TOKENS.md](docs/figma/TOKENS.md) marca cada
valor como **LIDO** ou **INFERIDO**, e a família tipográfica está registrada como não resolvida,
porque o arquivo a prende a uma variável que o modo de visualização não expõe.

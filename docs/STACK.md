# A stack, explicada para defender

Este documento responde duas perguntas que uma entrevista técnica faz:
**"por que você usou X?"** e **"o que aqui não era requisito?"**.

A primeira parte cobre a stack obrigatória do enunciado e mostra onde cada peça age de verdade.
A segunda lista o que foi acrescentado por decisão própria, com a justificativa de cada escolha.
Se alguém perguntar "por que tanta biblioteca?", a resposta honesta está na seção 2.

---

## 1. Stack obrigatória: o que cada peça faz aqui

### React + TypeScript

Interface e tipagem. O TypeScript roda em modo `strict`, sem nenhum `any` e sem nenhum
`@ts-ignore` no projeto. Isso não é estética: os tipos vêm dos schemas de contrato, então o
compilador reclama se a interface tentar ler um campo que a API não devolve.

> **Se perguntarem onde o TypeScript te salvou:** o contrato define `notice` como
> `'price-increased' | 'price-decreased' | 'quantity-reduced' | 'sold-out' | null`. Tratar só três
> dos quatro casos no carrinho não compila.

### TanStack Router

Rotas por arquivo em `src/routes/`. Faz três coisas concretas:

1. **Estado na URL com validação.** `validateSearch` recebe um schema Zod, então `?page=abc` não
   quebra a página: cai no padrão. Busca, filtros, ordenação e paginação são search params.
2. **Proteção de rota.** `src/routes/_authenticated.tsx` tem um `beforeLoad` que consulta a sessão
   antes de montar a tela e redireciona para `/login` com o destino em `redirect`.
3. **Tipagem de navegação.** `navigate({ to: '/nft/$nftId', params })` é verificado em tempo de
   compilação.

> **Pergunta provável: por que não React Router?** O enunciado exige TanStack Router. Mas o ganho
> real aqui é o `validateSearch` tipado, que é exatamente o requisito de "busca, filtros, ordenação
> e paginação compõem o estado da URL".

### TanStack Query

Todo o estado de servidor. É o ponto mais importante para defender, porque é onde estão as decisões
difíceis:

- **Chaves com `userId`** (`['user', <id>, 'favorites']`), que é o que impede vazamento entre contas.
- **Retry seletivo**: só erro transitório (rede, timeout, 5xx), nunca 4xx.
- **Atualização otimista com rollback** nos favoritos (`onMutate` guarda snapshot, `onError`
  restaura).
- **Cancelamento**: o `signal` da query é repassado ao Axios, então trocar de filtro aborta a
  requisição anterior e uma resposta velha não sobrescreve a nova.
- **Invalidação por evento**: quando chega `nft.updated`, o carrinho é invalidado para a API
  recalcular o resumo.

> **Pergunta provável: por que não Redux/Zustand junto?** Porque esses dados são cache de servidor,
> não estado de aplicação. Um store global por cima duplicaria o cache e criaria duas fontes de
> verdade. Ver a seção 7 de [DECISOES.md](DECISOES.md).

### Axios

Uma instância em `src/lib/http.ts`, e **toda** chamada passa por ela. Os interceptores fazem:
injeção de `Authorization` e `X-Guest-Id`, normalização de qualquer falha num `ApiError` com
`code`, `fields`, `isTimeout` e `isNetworkError`, e detecção de 401 de sessão expirada, que emite
um evento para o app encerrar a sessão e redirecionar.

> **Por que um wrapper `request(schema, config)`?** Porque ele valida a resposta com Zod antes de
> devolver. Dado fora do contrato vira erro, e não um dado torto dentro do cache.

### Socket.IO

Cliente real em `src/realtime/`, falando com o binding do MSW. As garantias estão em
[DECISOES.md](DECISOES.md), seções 2 e 3: dedupe por `eventId`, ordenação por `version`, filtro por
`userId` e reconciliação com REST na reconexão.

> **O ponto que impressiona:** respostas REST também registram a versão vista
> (`noteResourceVersion`), para um evento atrasado não sobrescrever um dado mais novo que acabou de
> chegar por HTTP.

### Tailwind CSS v4

Tokens em `src/index.css` com `@theme inline`. A regra que vale a pena citar: **nenhum componente
usa cor literal.** Quando os tokens foram trocados pelos valores lidos do Figma, a aplicação inteira
mudou de identidade visual sem uma única alteração de componente.

### shadcn/ui

Componentes escritos à mão sobre Radix, em `src/components/ui/`. Não é uma dependência instalada: é
código no repositório, que é como o shadcn funciona. O Radix entrega o comportamento difícil de
acessibilidade (foco preso em diálogo, navegação por teclado em select e tabs) e o estilo é nosso.

### MSW

Camada de rede simulada em `src/mocks/`, ligada por `VITE_ENABLE_MOCKS`. Intercepta REST e, via
`@mswjs/socket.io-binding`, também o WebSocket. Mantém estado consistente entre catálogo, favoritos,
carrinho, perfil, carteiras e pedidos, com persistência em `localStorage` e reset completo.

### Playwright

E2E em `tests/e2e/`, nos viewports 1440 e 390, com regressão visual. Cada teste parte de estado
isolado chamando `window.__mock.reset()`.

### Lighthouse

`lighthouse/run.mjs`: 3 medições por página e perfil, mediana por categoria, LCP/CLS/TBT, relatórios
HTML e JSON versionados.

---

## 2. O que foi acrescentado e NÃO é requisito

Esta é a lista que você precisa saber de cor, porque é onde a entrevista pergunta "por quê?".

| Adição | Por que está aqui | O que aconteceria sem |
| --- | --- | --- |
| **Zod** | O enunciado exige "contratos tipados entre transporte, estado e interface", mas não diz como. Zod permite que o mesmo schema valide a resposta HTTP **e** o formulário, com um tipo só derivado dele. | Tipos declarados à mão, que mentem em runtime: o TypeScript acredita, o servidor manda outra coisa. |
| **decimal.js** | O enunciado exige ETH como string decimal com precisão mantida. Precisão exige aritmética decimal. | `0.1 + 0.2 = 0.30000000000000004` no total do recibo. |
| **sonner** | Feedback de mutation. Acompanhado de região `aria-live`, porque toast sozinho não é acessível. | Feedback só visual, que falha no critério de acessibilidade. |
| **lucide-react** | Biblioteca de ícones padrão do shadcn/ui. | Ícones em SVG inline, mais código e sem consistência de traço. |
| **cva + clsx + tailwind-merge** | Convenção do shadcn para variantes de componente. `tailwind-merge` resolve conflito de classes quando um `className` externo sobrescreve. | Variantes com concatenação de string e conflitos silenciosos de classe. |
| **@fontsource** | Fontes servidas pelo próprio build, não por CDN externo. | Dependência de rede de terceiros, pior LCP e um problema de privacidade. |
| **ESLint** | A seção 12 do enunciado pede um comando de lint. Não existia e foi adicionado. | Requisito de entrega não cumprido. |
| **Vite** | Ferramenta de build. O enunciado deixa explicitamente a critério do candidato. | n/a |

### Decisões de engenharia que também não eram pedidas

| Decisão | Motivo |
| --- | --- |
| **`fingerprint` na cotação** | O enunciado pede revalidar antes de confirmar. O hash do conteúdo (linhas, cupom, rede) dá um jeito barato e exato de detectar que **algo** mudou, sem comparar campo a campo. |
| **Chave de idempotência amarrada a `(quoteId, fingerprint)`** | Define com precisão quando reusar a chave (reenvio da mesma intenção) e quando gerar outra (o usuário aceitou valores novos). |
| **Polling curto enquanto o pedido está `pending`** | Rede de segurança atrás do socket. Com ela, o tempo real deixa de ser ponto único de falha. |
| **Painel de cenários** (`MockPanel`) | Deixa o avaliador trocar de cenário sem abrir o console. O enunciado pede cenários configuráveis, não uma interface para eles. |
| **`docs/TESTIDS.md`** | Contrato de seletores e de estados de tela, acordado antes de escrever as telas. Permitiu que três frentes paralelas convergissem e que os testes fossem escritos sem caçar seletor. |
| **`UpdatingIndicator`** | Um componente só para o estado de "atualizando em segundo plano", que o enunciado exige em toda tela com dados. Evita três implementações diferentes da mesma coisa. |
| **PRNG semeado na latência** | O enunciado pede cenários determinísticos. Latência aleatória de verdade tornaria os testes instáveis. |
| **10 fotos reais do Figma cicladas pelos 40 NFTs** (`public/kurio/`, `REAL_IMAGES` em `src/mocks/fixtures.ts`) | A arte abstrata gerada (`scripts/generate-art.mjs`) foi removida do projeto e substituída por 10 retratos recortados do arquivo, repetidos pelo catálogo. Quatro nomes (`Emerald Ape #042`, `Sage Nomad #009`, `Neon Vessel #552`, `Golden Signal #160`) têm preço confirmado contra o Figma também; os outros 36 nomes continuam fictícios, só a imagem é real. As mesmas 10 fotos aparecem no ícone do cabeçalho, no favicon e nas seções de Criadores e Aprenda. |
| **`GET /nfts/facets`** (`src/mocks/handlers/catalog.ts`) | A barra de filtros do Figma mostra contagem por categoria e um slider de preço. Em vez de inventar os números no componente, o mock agrega do catálogo real (as mesmas 40 fixtures que `GET /nfts` usa) e devolve via um endpoint novo; o componente só formata o que a API manda. |

---

## 3. Perguntas difíceis e como responder

**"Como você garante que a compra não duplica?"**
Chave de idempotência por intenção de compra, persistida em `sessionStorage`. Em timeout o cliente
não assume falha: consulta `GET /orders?idempotencyKey=` para descobrir se o pedido existe, e só
reenvia com a mesma chave. Clique repetido é barrado por uma ref síncrona, antes do re-render.

**"E se dois eventos chegarem fora de ordem?"**
Cada evento tem `version` por recurso. Versão menor ou igual à última aplicada é descartada. As
leituras REST também registram a versão, então nem um evento atrasado nem uma resposta antiga
conseguem regredir o estado.

**"Como você evita vazar dados entre usuários?"**
Toda chave de cache privada carrega o `userId`. Não existe `['favorites']` sem dono. Além disso, o
logout limpa o cache inteiro e o socket é recriado a cada troca de sessão.

**"Por que o resumo de valores vem da API?"**
Porque se o cliente recalculasse, haveria duas fontes de verdade sobre quanto custa, e elas
divergiriam no primeiro arredondamento. O cliente formata, não soma.

**"Por que a aplicação carrega depois do MSW?"**
Porque o `engine.io-client` captura `globalThis.WebSocket` quando o módulo é avaliado. Avaliado
antes do MSW, ele guarda a referência original e o socket nunca conecta, em silêncio. A seção 6 de
[DECISOES.md](DECISOES.md) tem o detalhe.

**"O que você faria diferente com mais tempo?"**
Reproduzir a composição do Figma tela a tela, confirmar a família tipográfica, e tirar o MSW do
bundle de produção atrás de um build separado, que é o que segura a nota de performance no mobile.

# Especificações por feature

Cada seção aqui é a especificação que guiou a implementação de uma feature, escrita antes do código
correspondente e usada como entrada única para implementá-la.

O método foi: especificar, congelar o que é compartilhado, implementar em paralelo, verificar em
série.

1. **Especificar.** Contratos executáveis em `src/contracts/` (Zod), regras de projeto e armadilhas
   conhecidas em `CLAUDE.md`, convenção de seletores e estados obrigatórios de tela em
   `docs/TESTIDS.md`. Os três artefatos existiam antes das telas, em commits anteriores.
2. **Congelar.** Durante a implementação, nada em `contracts/`, `lib/`, `mocks/`, `realtime/` ou
   `components/ui/` podia mudar. Quem precisasse de alteração compartilhada parava e reportava.
3. **Implementar em paralelo.** Três frentes com conjuntos de escrita disjuntos. Sem sobreposição
   não há conflito de edição nem trabalho sobre uma versão desatualizada de um arquivo que outra
   frente acabou de reescrever.
4. **Verificar em série.** `typecheck`, `build`, `lint` e E2E só depois de todas terminarem, porque
   durante a execução o disco contém arquivos pela metade das outras frentes.

As alterações compartilhadas que apareceram foram reportadas em vez de aplicadas na hora, e estão no
histórico com a razão: liquidação preguiçosa do pedido em `mocks/handlers/orders.ts`, breakpoint do
cabeçalho em `components/layout/AppHeader.tsx`, ordem do merge do carrinho em `session.ts`, devolução
de foco do diálogo de carteiras e saída da rota privada ao encerrar a sessão.

| Frente | Pastas que podia escrever |
| --- | --- |
| Catálogo | `features/catalog/**`, `routes/index.tsx`, `routes/nft.$nftId.tsx` |
| Carrinho e checkout | `features/cart/pages/**`, `features/checkout/**`, rotas de carrinho, checkout e pedido |
| Conta | `features/account/**`, rotas de login, cadastro, perfil e carteiras |
| Testes | `tests/e2e/**` |

---

## 1. Catálogo

### Home

- Destaques via `GET /nfts/featured`.
- Catálogo paginado via `GET /nfts`, com `keepPreviousData` para a troca de página não piscar.
- Busca com debounce de ~350ms. A URL é a fonte da verdade: colar uma URL com `?q=` preenche o campo.
- Filtros combináveis: categorias (múltipla), faixa de preço, disponibilidade, ordenação.
- Digitação atualiza a URL com `replace`, sem poluir o histórico. Filtro, ordenação e página usam
  `push`, para o botão voltar restaurar o estado anterior.
- Qualquer mudança de filtro, busca ou ordenação remove a chave `page`.
- Em mobile os filtros vão para um `Sheet`, em desktop ficam em `aside`, com uma instância só no DOM.
- Paginação com links reais, não botões.

### Detalhe

- NFT inexistente (404) tem estado dedicado, distinto do erro genérico, e não faz retry.
- Galeria com miniaturas navegáveis por teclado, `alt` vindo do contrato, proporção fixa para CLS
  zero.
- Edições com preço, disponibilidade e `maxPerOrder`. Edição esgotada desabilitada; todas esgotadas
  desabilita a compra.
- Quantidade limitada a `min(available, maxPerOrder)`, reajustada ao trocar de edição.
- Favoritos com atualização otimista e rollback, chave `qk.favorites(userId)`. Sem sessão, o clique
  leva ao login preservando o destino.
- `OUT_OF_STOCK`, `QUANTITY_LIMIT` e `EDITION_UNAVAILABLE` com mensagens distintas.
- `nft.updated` do NFT aberto gera aviso visível e anúncio assertivo. A interface apenas reage ao
  barramento: não escreve no cache nem simula evento.

---

## 2. Carrinho e checkout

É a área com mais critérios eliminatórios: compra só confirmada pela API, sem pedido duplicado, sem
evento simulado na interface.

### Carrinho

- Funciona para visitante (`X-Guest-Id`) e para usuário.
- Quantidade com limite, remoção, cupom. Erro de cupom associado ao campo.
- **O resumo é o da API.** Subtotal, desconto, taxa e total nunca são recalculados no cliente.
- Avisos por item (`price-increased`, `price-decreased`, `quantity-reduced`, `sold-out`) com texto
  próprio, e um resumo no topo com ação que chama `POST /cart/acknowledge`.
- Item esgotado bloqueia o avanço para o checkout.

### Checkout em etapas

1. **Dados do colecionador**, validados pelo schema `BuyerInfo`, com rascunho em `sessionStorage`.
2. **Carteira e rede**, com conexão e desconexão, tratando `WALLET_REJECTED` e `WALLET_DISCONNECTED`.
3. **Revisão**, que cria a cotação e revalida antes de todo envio, além de em foco de janela,
   `nft.updated` e reconexão. Se mudou, mostra as diferenças e exige novo aceite.

### Idempotência

- Chave gerada uma vez por intenção de compra, identificada por `(quoteId, fingerprint)`, persistida
  em `sessionStorage`. Cotação nova significa chave nova.
- Clique repetido barrado por ref síncrona e por `disabled`.
- Timeout não é falha: consulta `GET /orders?idempotencyKey=`, adota o pedido se existir, reenvia com
  a mesma chave se não existir.
- Ao montar o checkout com uma chave guardada, consulta antes de deixar comprar de novo.

### Página do pedido

- Chave `qk.order(userId, orderId)`.
- `refetchInterval` curto apenas enquanto `pending`, como rede de segurança atrás do socket.
- Recibo lê exclusivamente o snapshot `Order`, nunca o carrinho atual.
- `order.updated` só dispara anúncio acessível.

---

## 3. Conta

### Login e cadastro

- Validação pelos schemas do contrato, não por regra reescrita.
- Erros da API aplicados no campo certo via `error.fields`. O 409 de e-mail em uso cai no campo de
  e-mail e move o foco para ele.
- `INVALID_CREDENTIALS` vira mensagem única, sem revelar qual campo falhou.
- Retorno ao `redirect` após autenticar, preservado também no link entre login e cadastro.

### Perfil

- Dados, avatar e senha, validados pelos schemas do contrato.
- Avatar redimensionado no canvas para no máximo 256px no maior lado antes do envio, em função pura
  e isolada (`features/account/image.ts`).
- Erro de senha atual incorreta aparece no campo da senha atual.

### Carteiras

- Principal e secundária, cadastro e edição no mesmo formulário dentro de um `Dialog`.
- Endereço validado pelo regex do contrato. Redes como grupo de checkboxes com `fieldset` e
  `legend`, porque um `label htmlFor` não endereça um grupo.
- A regra de função única segue o que a API faz: função repetida responde `409 CONFLICT` com
  `fields.role`, e a interface avisa antes em vez de prometer um rebaixamento que a API não executa.

---

## 4. Testes E2E

Fronteira: `tests/e2e/**`. Defeito encontrado é reportado, não corrigido pela própria frente.

**Regra de prioridade:** testes executáveis são critério eliminatório, então menos testes passando
vale mais que mais testes falhando. Cenário que não fecha vira `test.fixme()` com o motivo.

Cobertura dos 12 itens da seção 9 do enunciado, mais regressão visual de início, detalhe, carrinho e
pagamento, em desktop (1440) e mobile (390).

Regras: todo teste começa por `app.boot(rota, cenário)`, que chama `window.__mock.reset()`;
seletores por papel acessível e rótulo primeiro, `data-testid` quando não houver rótulo natural,
nunca por classe CSS ou posição; sem `waitForTimeout`; o backend é controlado por `window.__mock`,
nunca por interceptação de rede por fora.

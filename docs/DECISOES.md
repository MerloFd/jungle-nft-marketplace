# Decisões técnicas, explicadas

Este documento é para estudo. Cada seção responde três perguntas: **qual era o problema**,
**o que foi feito** e **o que daria errado sem isso**. A referência formal (contratos, rotas,
política de cache) está em [ARCHITECTURE.md](../ARCHITECTURE.md).

---

## 1. Idempotência do pedido

### O problema

Você clica em "Confirmar compra". O pedido sai do navegador, chega ao servidor, o servidor cria o
pedido… e a resposta se perde no caminho. Do lado do navegador, o que se vê é só um silêncio.

Esse silêncio é ambíguo e essa é a dificuldade inteira: **"não recebi resposta" não é a mesma coisa
que "não aconteceu"**. O pedido pode ter sido criado ou não, e o cliente não tem como saber olhando
só para o próprio erro.

Se a interface tratar o silêncio como falha e reenviar, você compra duas vezes. Se tratar como
sucesso, pode mostrar um recibo de um pedido que não existe. As duas saídas são inaceitáveis quando
há dinheiro envolvido.

### O que foi feito

Cada tentativa de compra ganha uma **chave única** (`crypto.randomUUID()`), enviada no cabeçalho
`Idempotency-Key`. O servidor guarda a chave junto do pedido. Se chegar um segundo pedido com a
mesma chave, ele **não cria outro**: devolve o que já existe.

A chave vive em `sessionStorage`, então sobrevive a um refresh, e está amarrada à *intenção de
compra* — identificada pelo par `(quoteId, fingerprint)`. Isso define com precisão quando reusar e
quando renovar:

- **Mesma intenção** (reenvio após timeout, usuário clicou de novo): **a mesma chave**. O servidor
  reconhece e não duplica.
- **Intenção diferente** (os valores mudaram e o usuário aceitou a cotação nova): **chave nova**.
  Senão o servidor devolveria o pedido antigo, com os valores velhos.

E no timeout a interface não adivinha. Ela **pergunta**: `GET /orders?idempotencyKey=<chave>`.
Se o pedido existe, adota e navega para ele; se não existe, oferece reenviar com a mesma chave.

### Sem isso

Toda instabilidade de rede no pior momento possível vira cobrança duplicada. É o tipo de defeito que
não aparece em teste manual (a rede do desenvolvedor é boa) e aparece em produção.

---

## 2. Dedupe de eventos por versão

### O problema

Tempo real não é uma fila ordenada e confiável. O mesmo evento pode chegar duas vezes (a biblioteca
reenvia), e eventos podem chegar **fora de ordem** — o preço muda para 2 ETH e depois para 3 ETH, mas
o de 3 chega primeiro.

Processar ingenuamente dá dois problemas: efeito aplicado em dobro (dois avisos, duas animações) e,
pior, **estado andando para trás** — você vê 3 ETH, chega o evento atrasado de 2 ETH, e a tela mostra
um preço que já não vale.

### O que foi feito

Todo evento carrega dois campos: `eventId` (identidade) e `version` (ordem). O cliente mantém dois
registros:

```ts
const seenEventIds = new Set<string>()       // já processei este evento?
const lastVersion = new Map<string, number>() // qual a última versão deste recurso?
```

E a regra de aceitação é curta:

```ts
if (seenEventIds.has(e.eventId)) return false            // duplicata
if (e.version <= lastVersion.get(chave)) return false     // atrasado
```

O detalhe que fecha a lógica: **as respostas REST também registram a versão** (`noteResourceVersion`).
Sem isso, você buscaria o NFT por HTTP na versão 10 e um evento perdido da versão 7 ainda conseguiria
sobrescrever a tela com um dado mais velho que o que você acabou de ler.

### Sem isso

Preço piscando entre dois valores, aviso de "o preço mudou" aparecendo em duplicata e, no pior caso,
um checkout exibindo um valor que o servidor já não aceita.

---

## 3. Reconciliação após reconexão

### O problema

O socket cai por 30 segundos. Nesse intervalo, três NFTs mudam de preço e um pedido é confirmado.
Esses eventos **não existem mais** — não há ninguém guardando para entregar depois. Quando a conexão
volta, a tela está desatualizada e não sabe disso.

### O que foi feito

Ao reconectar, o cliente **não tenta recuperar o histórico**. Ele admite que não sabe o que perdeu e
pergunta tudo de novo:

```ts
queryClient.invalidateQueries({ type: 'active' })
```

Só as queries **ativas** (o que está na tela agora), não o cache inteiro. O REST é a fonte da
verdade; o socket é só um atalho para não ficar perguntando.

Há ainda uma segunda rede de proteção: a página do pedido faz polling curto **enquanto o status é
`pending`**. Mesmo com o tempo real completamente indisponível, o pedido converge sozinho. O socket
deixa de ser um ponto único de falha.

### Sem isso

O caso clássico: você compra, o socket cai antes da confirmação, e o pedido fica "processando" para
sempre numa tela que nunca mais se atualiza.

---

## 4. Isolamento por usuário

### O problema

O TanStack Query guarda dados numa chave. Se a chave for `['favorites']`, ela é a mesma para todo
mundo. A Ana faz login, carrega os favoritos dela, sai; o Bruno entra — e vê os favoritos da Ana até
a próxima busca terminar.

No desafio isso não é um detalhe: **"exposição de dados entre usuários" é critério eliminatório**.

### O que foi feito

Duas camadas, porque uma só não basta.

**Primeira: o `userId` faz parte da chave.**

```ts
favorites: (userId) => ['user', userId, 'favorites']
cart:      (scope)  => ['cart', scope]   // scope = userId ou 'guest'
```

Dado do Bruno e dado da Ana ocupam lugares diferentes. Não existe o conceito de "os favoritos" sem
dono — é impossível ler o dado errado por engano, porque a chave errada simplesmente não tem dado.

**Segunda: a troca de sessão limpa.** No logout, `queryClient.clear()`. Na troca de usuário, o cache
inteiro é descartado antes de estabelecer a sessão nova. E o socket é recriado, porque ele também
carrega identidade — eventos `order.updated` de outro `userId` são descartados na chegada.

A primeira camada evita o vazamento; a segunda evita que dados de um usuário fiquem ocupando memória
e aparecendo em refetches depois que ele saiu.

### Sem isso

Um bug de privacidade — a pior categoria. E neste desafio, nota zero direto.

---

## 5. ETH como string decimal

### O problema

```js
0.1 + 0.2 === 0.3   // false
0.1 + 0.2           // 0.30000000000000004
```

Isso não é bug do JavaScript: é como números de ponto flutuante funcionam. Eles guardam valores em
base 2, e `0.1` não tem representação exata em base 2 — do mesmo jeito que `1/3` não tem
representação decimal exata.

Para a largura de uma caixa, o erro é irrelevante. Para **dinheiro**, não: os erros se acumulam a
cada operação, e um total de `2.0000000000000004 ETH` num recibo destrói a confiança na aplicação
inteira.

### O que foi feito

**ETH nunca vira `number`.** Trafega como string decimal (`"0.125"`) do contrato à tela, e toda
aritmética passa por `decimal.js`, em `src/lib/money.ts`:

```ts
eth.add('0.1', '0.2')   // "0.3" — exato
formatEth('0.125')      // "0.125 ETH"
```

O schema `EthAmount` do contrato é uma string validada por regex, o que faz a regra ser aplicada na
borda: uma resposta com número no lugar de string é rejeitada antes de entrar no cache.

E tem uma decisão de arquitetura junto: **o cliente não recalcula o resumo**. Subtotal, desconto,
taxa e total vêm sempre da API. O cliente formata, não soma. Assim não existe a possibilidade de a
tela discordar do servidor sobre quanto custa.

### Sem isso

Centavos somem ou aparecem, o total da tela não bate com o do recibo, e não há como explicar a
diferença ao usuário.

---

## 6. Por que a aplicação carrega depois do MSW

### O problema

Este é o mais sutil do projeto, e a causa está em **quando** um módulo é avaliado.

O `engine.io-client` (que o Socket.IO usa por baixo) faz, no carregamento do módulo, algo assim:

```js
const WebSocketImpl = globalThis.WebSocket   // guarda a referência AGORA
```

O MSW, por sua vez, intercepta **substituindo** `globalThis.WebSocket` por uma versão própria.

Então a ordem decide tudo. Se o Socket.IO for avaliado primeiro, ele guarda o WebSocket **original** —
e continua usando essa referência para sempre, mesmo depois de o MSW trocar a global. O resultado é
um socket que tenta conectar num servidor que não existe, e falha em silêncio. Não há erro útil: só
uma conexão que nunca abre.

### O que foi feito

`src/main.tsx` força a ordem com import dinâmico:

```ts
async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { startMocks } = await import('./mocks/browser')
    await startMocks()          // troca globalThis.WebSocket
  }
  const { renderApp } = await import('./app')  // só agora o Socket.IO é avaliado
  renderApp()
}
```

Um `import` estático de `./app` no topo do arquivo quebraria isso, porque imports estáticos são
resolvidos antes de qualquer linha do módulo rodar. O import dinâmico é o que permite dizer "só
carregue este módulo depois daquele `await`".

### Dois primos do mesmo problema

- **O caminho do socket é `/realtime/`, não `/socket.io/`.** O MSW remove o prefixo `/socket.io/`
  antes de comparar a URL, e com isso capturaria também o WebSocket do HMR do Vite — o recarregamento
  automático do desenvolvimento pararia de funcionar.
- **O mock envia o ping do protocolo a cada 20s.** O Socket.IO derruba a conexão por conta própria se
  o servidor não dá sinal de vida. Como aqui o "servidor" é código no navegador, esse heartbeat
  precisa ser escrito à mão.

### Sem isso

O tempo real não funciona, e o pior é que ele falha **em silêncio**. Nada aparece no console: o
socket só nunca conecta.

---

## 7. Dois extras que valem o mesmo tipo de atenção

### Por que não existe gerenciador de estado global

Não há Redux nem Zustand, e isso é proposital. O estado foi separado por natureza:

| tipo | onde mora | porquê |
| --- | --- | --- |
| dados do servidor | TanStack Query | é cache, não estado: precisa de revalidação, dedupe, retry, invalidação |
| busca, filtros, ordenação, página | URL | o enunciado exige; sobrevive a refresh, ao histórico e a link compartilhado |
| rascunho do checkout e chave de idempotência | `sessionStorage` | precisa sobreviver a refresh, mas não é dado de servidor |
| abrir/fechar, passo do formulário | `useState` | não é global e não deve virar global |

Colocar um store global por cima duplicaria o cache do Query — e dado duplicado é dado que diverge.
Pior: seria o caminho mais curto para o vazamento entre usuários da seção 4.

### Por que a URL é a fonte da verdade do catálogo

Busca, filtros, ordenação e página vivem nos search params, não em `useState`. Isso dá de graça três
comportamentos que o usuário espera: o link compartilhado abre o mesmo resultado, o refresh não perde
o filtro e o botão voltar desfaz a última escolha.

Há uma sutileza: **digitar não entra no histórico** (a busca atualiza a URL com `replace`), mas
**escolher um filtro entra** (com `push`). Se cada tecla criasse uma entrada, voltar exigiria vinte
cliques para sair de uma busca.

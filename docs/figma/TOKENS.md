# Tokens lidos do Figma: "Marketplace de NFTs GreenMint" (marca na tela: **KURIO**)

Arquivo: `Frontend-Challenge` (Ff0SksUi7UFtPWUO8kyNtw), página "Marketplace de NFTs GreenMint".
Acesso: somente visualização e comentário (sem Dev Mode).

## Como ler esta tabela

| marca | o que significa |
| --- | --- |
| **LIDO** | valor que o painel Properties do Figma mostrou como texto. Não há inferência: ou o painel dizia isso, ou não está aqui. |
| **INFERIDO** | leitura minha a partir da imagem renderizada. Pode estar errado, e é exatamente o que eu preciso que você confirme. |

Confira as linhas LIDO por garantia, mas o foco da sua revisão são as linhas **INFERIDO**.

---

## 1. Cores (estilos nomeados do arquivo)

| token do Figma | valor | marca | onde foi lido |
| --- | --- | --- | --- |
| `color/ink` | `#140D0A` | LIDO | fundo do frame `Desktop / Início`; também a cor do texto "Entrar" e "EXPLORAR" sobre o botão primário |
| `color/primary` | `#D28A4C` | LIDO | preenchimento do `Login Button` (botão "Entrar") |
| `color/foreground` | `#F5F1EB` | LIDO | texto "Bem-vindo à Kurio" |
| `color/text-secondary` | `#CFB28C` | LIDO | parágrafo do hero ("Descubra NFTs selecionados…") |
| `color/surface-card` | `#241612` | LIDO | `Rectangle 6`, fundo do card de NFT na grade |
| `color/text-accent` | `#E89B55` | LIDO | preço "1.19 ETH" no card |
| divisor do cabeçalho | `color/primary` a 0.3px | LIDO | `Line 1`, abaixo do cabeçalho |
| borda neutra | `#3A251C` | **INFERIDO** | derivada da família do card; o Figma só usa o divisor âmbar |
| hover de superfície | `#32201A` | **INFERIDO** | entre card e borda |
| hover do primário | `#C07C42` | **INFERIDO** | primário escurecido |
| erro / sucesso / aviso | `#C2452F` / `#2F8F5B` / `#C98A24` | **INFERIDO** | o arquivo não expõe cores de estado; escolhidas para conviver com o âmbar e passar em contraste |

Observação importante: os nomes dos estilos (`color/ink`, `color/primary`, `color/foreground`,
`color/text-secondary`) são os nomes reais do arquivo. Vou usar exatamente esses nomes como
tokens no `src/index.css`, para o CSS ficar rastreável ao Figma.

## 2. Tipografia (estilos nomeados)

| estilo do Figma | tamanho / entrelinha | peso | tracking | marca | onde foi lido |
| --- | --- | --- | --- | --- | --- |
| `Display/43 Bold` | 43px / 70px | 700 | 0% | LIDO | H1 "SEJA DONO DO FUTURO DA ARTE DIGITAL" |
| `Body Large/16 Bold` | 16px / 20px | 700 | 0% | LIDO | rótulo do botão "EXPLORAR" |
| `Body Large/16 Medium` | 16px / 100% | 500 | 0% | LIDO | rótulo "Entrar" |
| `Body/14 Regular` | 14px / 24px | 400 | 0% | LIDO | parágrafo do hero |
| `Body/14 Medium` | 14px / 16px | 500 | **10%** | LIDO | sobretítulo "Bem-vindo à Kurio" |
| `Body Large/18 Bold` | 18px / 16px | 700 | 0% | LIDO | preço no card de NFT |
| família tipográfica | `font/family` (variável) | n/a | n/a | **NÃO RESOLVIDO** | o painel mostra o nome da variável, não a fonte |

**A família é o buraco da leitura.** O arquivo prende a fonte a uma variável chamada `font/family`
e, sem Dev Mode, o painel não resolve o valor. Pela imagem, o arquivo inteiro (títulos, corpo,
navegação, preços) usa uma **monoespaçada**, o que é INFERIDO. O projeto já carrega Space Mono, que bate
visualmente com o desenho. Preciso que você confirme o nome da fonte (no Figma: selecione um texto
e veja o painel de tipografia, ou me diga o que aparece em `font/family`).

## 3. Geometria e grade

| medida | valor | marca | onde foi lido |
| --- | --- | --- | --- |
| largura do frame desktop | 1440px (fixo) | LIDO | `Desktop / Início` |
| padding horizontal da página | 120px | LIDO | `Desktop / Início` |
| padding vertical da página | 24px | LIDO | `Desktop / Início` |
| largura útil do conteúdo | 1200px | LIDO | seção `Top`, "Fill (1,200px)" |
| gap entre seções da página | 96px | LIDO | `Desktop / Início` |
| gap interno da seção `Top` | 32px | LIDO | seção `Top` |
| raio do botão | 6px | LIDO | `Login Button` |
| altura do botão | 35px | LIDO | `Login Button` |
| raio da imagem do card | 15px | LIDO | `NFT Artwork 03` (250×250) |
| card de NFT | 258 × 300 | LIDO | `Rectangle 6` |
| barra lateral de filtros | 310px, gap interno 24px | LIDO | `Sidebar` |
| gap entre barra lateral e grade | 48px | LIDO | `Products` |
| frame mobile | 414 × 896, padding lateral **24px**, gap 16px | LIDO | `Mobile / Início` |

> Impacto direto: hoje o `PageContainer` usa `max-w-[1280px]` com `px-[115px]`.
> O correto é conteúdo de **1200px** com **120px** de padding lateral no desktop.

## 4. Estrutura da home (LIDO, nomes das camadas)

`Desktop / Início` → `Top` → `Header With Divider` → `Header Row` (`Logo`, `Nav`, `Header Actions`
→ `Search Icon`, `Cart`, `Login`) + `Line 1`; depois `Hero`; e as seções `Products`, `Promos`,
`Blog`, `Footer`.

## 5. Conteúdo visível (INFERIDO, lido da imagem)

- Marca na tela: **KURIO** (logotipo à esquerda, caixa alta, espaçamento largo).
- Navegação: Início · Mercado · Criadores · Aprenda. O item ativo é laranja com sublinhado.
- Ações do cabeçalho: busca (ícone), carrinho (ícone com contador "6"), botão "Entrar" com ícone.
- Hero: sobretítulo + H1 em caixa alta + parágrafo + botão "EXPLORAR"; imagem à direita com cantos
  arredondados; três bolinhas de carrossel abaixo do texto.
- Seções seguintes: "Coleções" (lista com contagem, ex. "Arte digital (33)"), grade de NFTs com
  "Ordenar por: Listados recentemente", "NFTs em destaque / Oferta limitada", paginação numerada,
  uma faixa promocional, "Diário da Coragem" (blog) e rodapé com colunas.
- Telas no arquivo (desktop e mobile): Início, Detalhes do NFT, Carrinho de NFTs, Pagamento,
  Confirmação de Pedido, Login, Cadastro, Perfil do Colecionador, Carteiras.

## 6. O que já foi aplicado no código

- `src/index.css`: todos os tokens acima, com o nome do estilo do Figma anotado em cada linha.
  Atenção a um detalhe que muda o visual inteiro: o texto sobre o botão primário é **ink escuro**
  (`#140D0A`), não branco.
- `src/index.css`: escala de raios 6px (controles) / 15px (cards).
- `src/index.css`: tipografia monoespaçada em toda a interface (ver a ressalva da família acima).
- `src/components/layout/PageContainer.tsx`: conteúdo de 1200px centrado, 24px de padding no mobile.

## 7. O que ainda falta ler

1. Família tipográfica (bloqueada pela variável `font/family`): **preciso de você**.
2. Cores de estado do pedido (pendente / confirmado / recusado) nas telas de Pagamento e Confirmação.
3. Medidas internas das telas de Detalhe, Carrinho, Pagamento, Login, Perfil e Carteiras.

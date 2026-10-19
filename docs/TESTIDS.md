# Convenções de `data-testid` e de estados de tela

Documento compartilhado entre as features e os testes E2E. Quem cria a tela segue esta lista;
quem escreve o teste em `tests/e2e` só usa estes identificadores (ou papéis/rótulos acessíveis).

## Regra geral

- Preferência de seleção nos testes: papel acessível (`getByRole`) > rótulo > `data-testid`.
  O `data-testid` existe para blocos sem rótulo natural (listas, resumos, estados).
- Nomes em kebab-case, prefixados pela área.
- Todo bloco com dados remotos tem os cinco estados, com os sufixos abaixo:
  - carregando: `<bloco>-skeleton` (usar `<Skeleton>`; mesmas dimensões do conteúdo real)
  - vazio: `<bloco>-empty` (`<EmptyState>`)
  - erro: `<bloco>-error` (`<ErrorState onRetry>` — botão "Tentar novamente")
  - sucesso: `<bloco>` (a própria lista/cartão)
  - atualizando em segundo plano: `<UpdatingIndicator id="<bloco>">` → `<bloco>-updating`

## Catálogo

| testid | elemento |
| --- | --- |
| `featured`, `featured-skeleton`, `featured-error` | faixa de destaques |
| `catalog`, `catalog-skeleton`, `catalog-empty`, `catalog-error`, `catalog-updating` | grade do catálogo |
| `catalog-search` | campo de busca |
| `catalog-filters` | painel/sheet de filtros |
| `filter-category-<slug>` | checkbox de categoria |
| `filter-min-price`, `filter-max-price`, `filter-availability`, `catalog-sort` | controles de filtro/ordenação |
| `catalog-clear-filters` | limpar filtros |
| `catalog-total` | contagem de resultados |
| `nft-card-<id>` | cartão do NFT |
| `nft-detail`, `nft-detail-skeleton`, `nft-detail-error`, `nft-detail-not-found` | detalhe |
| `nft-gallery`, `nft-gallery-thumb-<i>` | galeria |
| `edition-<id>` | opção de edição |
| `qty-input`, `qty-decrease`, `qty-increase` | quantidade |
| `favorite-toggle` | botão de favorito (`aria-pressed`) |
| `add-to-cart` | adicionar ao carrinho |
| `nft-updated-notice` | aviso de preço/estoque alterado via socket |

## Carrinho, checkout e pedido

| testid | elemento |
| --- | --- |
| `cart`, `cart-skeleton`, `cart-empty`, `cart-error`, `cart-updating` | carrinho |
| `cart-item-<itemId>`, `cart-item-qty`, `cart-item-remove` | item |
| `cart-item-notice` | aviso de preço/estoque do item |
| `coupon-input`, `coupon-apply`, `coupon-remove`, `coupon-applied`, `coupon-error` | cupom |
| `cart-summary`, `summary-subtotal`, `summary-discount`, `summary-fee`, `summary-total` | resumo da API |
| `cart-checkout` | ir para o checkout |
| `checkout`, `checkout-step-<n>` | checkout |
| `buyer-form` | dados do colecionador |
| `wallet-option-<id>`, `network-select`, `wallet-connect`, `wallet-status` | carteira e rede |
| `quote`, `quote-skeleton`, `quote-error`, `quote-expires-at` | cotação |
| `quote-changed-notice`, `quote-accept-changes` | revalidação com mudança |
| `place-order` | confirmar compra |
| `order`, `order-skeleton`, `order-error`, `order-updating` | pedido |
| `order-status` | estado (`data-status="pending\|confirmed\|declined"`) |
| `order-id`, `order-tx-hash`, `order-receipt`, `order-decline-reason`, `order-retry` | recibo |

## Conta

| testid | elemento |
| --- | --- |
| `login-form`, `login-error`, `login-expired-notice` | login |
| `register-form`, `register-error` | cadastro |
| `profile-form`, `profile-skeleton`, `profile-error`, `profile-updating` | perfil |
| `avatar-input`, `avatar-preview`, `avatar-save` | avatar |
| `password-form` | troca de senha |
| `wallets`, `wallets-skeleton`, `wallets-empty`, `wallets-error`, `wallets-updating` | carteiras |
| `wallet-card-<id>`, `wallet-edit-<id>`, `wallet-new`, `wallet-form`, `wallet-save` | carteira |

## Layout (já existentes)

`live-region-polite`, `live-region-assertive`, `cart-count`, `connection-banner`, `mock-panel-trigger`.

## Elementos duplicados por breakpoint

O `AppHeader` monta o link do carrinho duas vezes (barra desktop `hidden md:flex` e
barra mobile `md:hidden`), então `cart-count` aparece duas vezes no DOM em qualquer
viewport. Nos testes use o helper `app.cartBadge()`, que filtra pelo visível, em vez de
`getByTestId('cart-count')` direto (modo estrito do Playwright falharia).

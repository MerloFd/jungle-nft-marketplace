/**
 * Contratos compartilhados entre transporte (Axios), estado (TanStack Query),
 * interface e a camada de mocks (MSW). Toda resposta da API é validada com
 * estes schemas na borda do cliente HTTP (src/api).
 *
 * Valores em ETH trafegam SEMPRE como strings decimais (ex.: "0.125").
 * Quantidades são inteiras.
 */
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Primitivos
// ---------------------------------------------------------------------------

export const EthAmount = z.string().regex(/^\d+(\.\d+)?$/, 'valor ETH inválido')
export type EthAmount = z.infer<typeof EthAmount>

export const Network = z.enum(['ethereum', 'polygon', 'arbitrum'])
export type Network = z.infer<typeof Network>

export const NETWORK_LABEL: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
}

export const Category = z.enum(['art', 'collectibles', 'music', 'photography', 'video', 'utility', 'sport', 'virtual-worlds'])
export type Category = z.infer<typeof Category>

export const CATEGORY_LABEL: Record<Category, string> = {
  art: 'Arte',
  collectibles: 'Colecionáveis',
  music: 'Música',
  photography: 'Fotografia',
  video: 'Vídeo',
  utility: 'Utilidade',
  sport: 'Esporte',
  'virtual-worlds': 'Mundos virtuais',
}

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

export const ErrorCode = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'OUT_OF_STOCK',
  'QUANTITY_LIMIT',
  'EDITION_UNAVAILABLE',
  'PRICE_CHANGED',
  'QUOTE_EXPIRED',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'IDEMPOTENCY_CONFLICT',
  'WALLET_REJECTED',
  'WALLET_DISCONNECTED',
  'TRANSIENT',
  'INTERNAL',
])
export type ErrorCode = z.infer<typeof ErrorCode>

export const ApiErrorBody = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    /** Erros por campo (formulários). Chave = nome do campo. */
    fields: z.record(z.string(), z.string()).optional(),
    details: z.unknown().optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof ApiErrorBody>

// ---------------------------------------------------------------------------
// NFTs
// ---------------------------------------------------------------------------

export const Creator = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string(),
})
export type Creator = z.infer<typeof Creator>

export const Edition = z.object({
  id: z.string(),
  /** Ex.: "Standard", "Gold", "Platinum" */
  name: z.string(),
  priceEth: EthAmount,
  /** Unidades ainda disponíveis para compra. 0 = esgotada. */
  available: z.number().int().nonnegative(),
  supply: z.number().int().positive(),
  /** Limite por pedido. */
  maxPerOrder: z.number().int().positive(),
})
export type Edition = z.infer<typeof Edition>

export const NftSummary = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  category: Category,
  creator: Creator,
  collectionName: z.string(),
  /** Menor preço entre as edições disponíveis (ou da edição mais barata se esgotado). */
  floorPriceEth: EthAmount,
  /** Soma das unidades disponíveis em todas as edições. */
  available: z.number().int().nonnegative(),
  favoritesCount: z.number().int().nonnegative(),
  featured: z.boolean(),
  createdAt: z.string(),
  version: z.number().int(),
})
export type NftSummary = z.infer<typeof NftSummary>

export const NftDetail = NftSummary.extend({
  description: z.string(),
  images: z.array(z.object({ src: z.string(), alt: z.string() })).min(1),
  editions: z.array(Edition).min(1),
  tags: z.array(z.string()),
  contractAddress: z.string(),
  tokenStandard: z.string(),
  network: Network,
})
export type NftDetail = z.infer<typeof NftDetail>

export const NftSort = z.enum(['recent', 'price-asc', 'price-desc', 'popular', 'name'])
export type NftSort = z.infer<typeof NftSort>

export const NFT_SORT_LABEL: Record<NftSort, string> = {
  recent: 'Mais recentes',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  popular: 'Mais favoritados',
  name: 'Nome (A-Z)',
}

export const Availability = z.enum(['all', 'available', 'sold-out'])
export type Availability = z.infer<typeof Availability>

/** Parâmetros de listagem. Os mesmos nomes são usados na URL e na API. */
export const NftListParams = z.object({
  q: z.string().optional(),
  category: z.array(Category).optional(),
  minPrice: EthAmount.optional(),
  maxPrice: EthAmount.optional(),
  availability: Availability.optional(),
  sort: NftSort.optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(48).optional(),
})
export type NftListParams = z.infer<typeof NftListParams>

export const Paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  })

export const NftListResponse = Paginated(NftSummary)
export type NftListResponse = z.infer<typeof NftListResponse>

export const FeaturedResponse = z.object({ items: z.array(NftSummary) })
export type FeaturedResponse = z.infer<typeof FeaturedResponse>

// ---------------------------------------------------------------------------
// Sessão e conta
// ---------------------------------------------------------------------------

export const User = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
  bio: z.string(),
  avatarUrl: z.string(),
  createdAt: z.string(),
})
export type User = z.infer<typeof User>

export const Session = z.object({
  token: z.string(),
  expiresAt: z.string(),
  user: User,
})
export type Session = z.infer<typeof Session>

export const SessionInfo = z.object({
  expiresAt: z.string(),
  user: User,
})
export type SessionInfo = z.infer<typeof SessionInfo>

export const LoginInput = z.object({
  email: z.email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe a senha'),
})
export type LoginInput = z.infer<typeof LoginInput>

export const PASSWORD_RULE = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres')
  .regex(/[A-Za-z]/, 'A senha precisa ter pelo menos uma letra')
  .regex(/\d/, 'A senha precisa ter pelo menos um número')

export const RegisterInput = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  username: z
    .string()
    .trim()
    .min(3, 'Mínimo de 3 caracteres')
    .max(24, 'Máximo de 24 caracteres')
    .regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e _'),
  email: z.email('Informe um e-mail válido'),
  password: PASSWORD_RULE,
})
export type RegisterInput = z.infer<typeof RegisterInput>

export const ProfileUpdateInput = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  username: RegisterInput.shape.username,
  email: z.email('Informe um e-mail válido'),
  bio: z.string().max(280, 'Máximo de 280 caracteres'),
})
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateInput>

export const AvatarUpdateInput = z.object({
  /** data URL (image/png | image/jpeg | image/webp), até ~1MB */
  dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/, 'Formato de imagem não suportado'),
})
export type AvatarUpdateInput = z.infer<typeof AvatarUpdateInput>

export const PasswordChangeInput = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: PASSWORD_RULE,
})
export type PasswordChangeInput = z.infer<typeof PasswordChangeInput>

// ---------------------------------------------------------------------------
// Favoritos
// ---------------------------------------------------------------------------

export const FavoritesResponse = z.object({ nftIds: z.array(z.string()) })
export type FavoritesResponse = z.infer<typeof FavoritesResponse>

// ---------------------------------------------------------------------------
// Carrinho e cotação
// ---------------------------------------------------------------------------

export const CartItem = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().positive(),
  /** Dados atuais do catálogo (mudam com nft.updated). */
  nftName: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  editionName: z.string(),
  unitPriceEth: EthAmount,
  available: z.number().int().nonnegative(),
  maxPerOrder: z.number().int().positive(),
  lineTotalEth: EthAmount,
  /** Avisos gerados pela API quando preço/estoque mudaram desde a inclusão. */
  notice: z.enum(['price-increased', 'price-decreased', 'quantity-reduced', 'sold-out']).nullable(),
})
export type CartItem = z.infer<typeof CartItem>

export const AppliedCoupon = z.object({
  code: z.string(),
  description: z.string(),
  percentOff: z.number(),
})
export type AppliedCoupon = z.infer<typeof AppliedCoupon>

export const PriceSummary = z.object({
  subtotalEth: EthAmount,
  discountEth: EthAmount,
  networkFeeEth: EthAmount,
  totalEth: EthAmount,
})
export type PriceSummary = z.infer<typeof PriceSummary>

export const Cart = z.object({
  id: z.string(),
  ownerType: z.enum(['guest', 'user']),
  items: z.array(CartItem),
  coupon: AppliedCoupon.nullable(),
  network: Network,
  summary: PriceSummary,
  version: z.number().int(),
  updatedAt: z.string(),
})
export type Cart = z.infer<typeof Cart>

export const AddCartItemInput = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().positive(),
})
export type AddCartItemInput = z.infer<typeof AddCartItemInput>

export const UpdateCartItemInput = z.object({ quantity: z.number().int().positive() })
export const ApplyCouponInput = z.object({ code: z.string().trim().min(1, 'Informe o cupom') })

export const QuoteLine = z.object({
  cartItemId: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  nftName: z.string(),
  editionName: z.string(),
  image: z.string(),
  imageAlt: z.string(),
  quantity: z.number().int().positive(),
  unitPriceEth: EthAmount,
  lineTotalEth: EthAmount,
})
export type QuoteLine = z.infer<typeof QuoteLine>

/** Cotação: snapshot validado pela API e referência obrigatória para criar o pedido. */
export const Quote = z.object({
  id: z.string(),
  lines: z.array(QuoteLine).min(1),
  coupon: AppliedCoupon.nullable(),
  network: Network,
  summary: PriceSummary,
  /** Hash do conteúdo (linhas + cupom + rede). Muda se qualquer valor mudar. */
  fingerprint: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
})
export type Quote = z.infer<typeof Quote>

export const CreateQuoteInput = z.object({ network: Network })
export type CreateQuoteInput = z.infer<typeof CreateQuoteInput>

/** Validação de cotação: retorna se a cotação ainda vale ou a cotação nova. */
export const QuoteValidation = z.object({
  valid: z.boolean(),
  quote: Quote,
  /** Diferenças encontradas em relação à cotação anterior. */
  changes: z.array(
    z.object({
      kind: z.enum(['price', 'availability', 'coupon', 'fee', 'removed']),
      nftId: z.string().optional(),
      message: z.string(),
    }),
  ),
})
export type QuoteValidation = z.infer<typeof QuoteValidation>

// ---------------------------------------------------------------------------
// Carteiras
// ---------------------------------------------------------------------------

export const WalletProvider = z.enum(['metamask', 'coinbase', 'walletconnect'])
export type WalletProvider = z.infer<typeof WalletProvider>

export const WALLET_PROVIDER_LABEL: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  coinbase: 'Coinbase Wallet',
  walletconnect: 'WalletConnect',
}

export const WalletRole = z.enum(['primary', 'secondary'])
export type WalletRole = z.infer<typeof WalletRole>

export const Wallet = z.object({
  id: z.string(),
  role: WalletRole,
  label: z.string(),
  provider: WalletProvider,
  address: z.string(),
  networks: z.array(Network).min(1),
  updatedAt: z.string(),
})
export type Wallet = z.infer<typeof Wallet>

export const WalletsResponse = z.object({ items: z.array(Wallet) })

export const WalletInput = z.object({
  role: WalletRole,
  label: z.string().trim().min(2, 'Dê um nome para a carteira').max(32, 'Máximo de 32 caracteres'),
  provider: WalletProvider,
  address: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço inválido (0x seguido de 40 caracteres hexadecimais)'),
  networks: z.array(Network).min(1, 'Selecione pelo menos uma rede'),
})
export type WalletInput = z.infer<typeof WalletInput>

export const WalletConnection = z.object({
  walletId: z.string(),
  network: Network,
  status: z.enum(['connected', 'disconnected']),
})
export type WalletConnection = z.infer<typeof WalletConnection>

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export const OrderStatus = z.enum(['pending', 'confirmed', 'declined'])
export type OrderStatus = z.infer<typeof OrderStatus>

export const BuyerInfo = z.object({
  fullName: z.string().trim().min(3, 'Informe seu nome completo'),
  email: z.email('Informe um e-mail válido'),
  country: z.string().trim().min(2, 'Informe o país'),
  acceptTerms: z.literal(true, { error: 'Você precisa aceitar os termos' }),
})
export type BuyerInfo = z.infer<typeof BuyerInfo>

export const CreateOrderInput = z.object({
  quoteId: z.string(),
  quoteFingerprint: z.string(),
  walletId: z.string(),
  network: Network,
  buyer: BuyerInfo,
})
export type CreateOrderInput = z.infer<typeof CreateOrderInput>

/** Recibo: snapshot imutável do pedido no momento da criação. */
export const Order = z.object({
  id: z.string(),
  status: OrderStatus,
  idempotencyKey: z.string(),
  lines: z.array(QuoteLine),
  coupon: AppliedCoupon.nullable(),
  summary: PriceSummary,
  network: Network,
  wallet: z.object({ id: z.string(), label: z.string(), address: z.string(), provider: WalletProvider }),
  buyer: BuyerInfo.omit({ acceptTerms: true }),
  transactionHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  declineReason: z.string().nullable(),
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Order = z.infer<typeof Order>

// ---------------------------------------------------------------------------
// Tempo real (Socket.IO)
// ---------------------------------------------------------------------------

export const NftUpdatedEvent = z.object({
  eventId: z.string(),
  type: z.literal('nft.updated'),
  resource: z.object({ type: z.literal('nft'), id: z.string() }),
  version: z.number().int(),
  occurredAt: z.string(),
  data: z.object({
    nftId: z.string(),
    floorPriceEth: EthAmount,
    available: z.number().int().nonnegative(),
    editions: z.array(Edition.pick({ id: true, priceEth: true, available: true })),
  }),
})
export type NftUpdatedEvent = z.infer<typeof NftUpdatedEvent>

export const OrderUpdatedEvent = z.object({
  eventId: z.string(),
  type: z.literal('order.updated'),
  resource: z.object({ type: z.literal('order'), id: z.string() }),
  version: z.number().int(),
  occurredAt: z.string(),
  /** Dono do pedido: o cliente descarta eventos de outro usuário. */
  userId: z.string(),
  data: z.object({
    orderId: z.string(),
    status: OrderStatus,
    transactionHash: z.string().nullable(),
    declineReason: z.string().nullable(),
  }),
})
export type OrderUpdatedEvent = z.infer<typeof OrderUpdatedEvent>

export const RealtimeEvent = z.discriminatedUnion('type', [NftUpdatedEvent, OrderUpdatedEvent])
export type RealtimeEvent = z.infer<typeof RealtimeEvent>

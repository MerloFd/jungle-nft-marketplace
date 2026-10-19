import { realtimeHandler } from '../realtime'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { orderHandlers } from './orders'
import { profileHandlers } from './profile'
import { walletHandlers } from './wallets'

export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
  realtimeHandler,
]

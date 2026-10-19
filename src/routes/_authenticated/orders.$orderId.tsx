import { createFileRoute } from '@tanstack/react-router'
import { OrderPage } from '@/features/checkout/pages/OrderPage'

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  component: OrderPage,
})

import { createFileRoute } from '@tanstack/react-router'
import { authSearchSchema } from '@/features/account/search'
import { LoginPage } from '@/features/account/pages/LoginPage'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  component: LoginPage,
})

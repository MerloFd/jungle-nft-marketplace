import { createFileRoute } from '@tanstack/react-router'
import { authSearchSchema } from '@/features/account/search'
import { RegisterPage } from '@/features/account/pages/RegisterPage'

export const Route = createFileRoute('/register')({
  validateSearch: authSearchSchema,
  component: RegisterPage,
})

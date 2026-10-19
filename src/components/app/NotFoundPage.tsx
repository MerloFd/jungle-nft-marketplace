import { Link } from '@tanstack/react-router'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'

export function NotFoundPage({ title = 'Página não encontrada', description = 'O endereço que você acessou não existe ou foi removido.' }: { title?: string; description?: string }) {
  return (
    <PageContainer className="flex flex-col items-center gap-6 py-24 text-center">
      <p className="font-mono text-6xl font-bold text-brand" aria-hidden="true">
        404
      </p>
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="max-w-md text-muted-foreground">{description}</p>
      <Button asChild>
        <Link to="/">Voltar ao marketplace</Link>
      </Button>
    </PageContainer>
  )
}

import { PageContainer } from '@/components/layout/PageContainer'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UpdatingIndicator } from '@/components/ui/updating-indicator'
import { AvatarForm } from '../components/AvatarForm'
import { PasswordForm } from '../components/PasswordForm'
import { ProfileDataForm } from '../components/ProfileDataForm'
import { useProfile } from '../hooks'

/** Skeleton com as mesmas alturas do formulário real (label + campo h-12 + botão h-11). */
function FieldSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div data-testid="profile-skeleton" className="flex flex-col gap-6">
      <div className="flex gap-4 border-b border-border pb-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="flex max-w-xl flex-col gap-5">
        <FieldSkeleton />
        <FieldSkeleton />
        <FieldSkeleton />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-11 w-44" />
      </div>
    </div>
  )
}

/**
 * Organização em Tabs: em 390px os três formulários empilhados dariam uma página
 * muito longa (dados + avatar + senha), e as abas deixam cada tarefa isolada sem
 * rolagem. A TabsList rola na horizontal se o espaço faltar.
 */
export function ProfilePage() {
  const profile = useProfile()

  return (
    <PageContainer as="section" className="py-10 md:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold md:text-4xl">Meu perfil</h1>
        <UpdatingIndicator id="profile" active={profile.isFetching && !profile.isPending} />
      </div>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Atualize seus dados públicos, a foto de perfil e a senha da conta.
      </p>

      <div className="mt-8">
        {profile.isPending ? (
          <ProfileSkeleton />
        ) : profile.isError || !profile.data ? (
          <div data-testid="profile-error">
            <ErrorState
              title="Não foi possível carregar seu perfil"
              description="Verifique sua conexão e tente novamente."
              onRetry={() => void profile.refetch()}
              retrying={profile.isFetching}
            />
          </div>
        ) : (
          <Tabs defaultValue="dados">
            <TabsList aria-label="Seções do perfil">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="avatar">Avatar</TabsTrigger>
              <TabsTrigger value="senha">Senha</TabsTrigger>
            </TabsList>
            <TabsContent value="dados">
              <ProfileDataForm user={profile.data} />
            </TabsContent>
            <TabsContent value="avatar">
              <AvatarForm user={profile.data} />
            </TabsContent>
            <TabsContent value="senha">
              <PasswordForm />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageContainer>
  )
}

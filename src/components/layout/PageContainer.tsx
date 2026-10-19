import * as React from 'react'
import { cn } from '@/lib/utils'

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'main' | 'header' | 'footer'
}

/**
 * Grade do Figma: conteúdo de 1200px centrado (o frame desktop tem 1440 com
 * 120px de cada lado) e 24px de padding no frame mobile (414px).
 */
export function PageContainer({ as: Tag = 'div', className, ...props }: PageContainerProps) {
  return <Tag className={cn('mx-auto w-full max-w-[1200px] px-6 md:px-10 xl:px-0', className)} {...props} />
}

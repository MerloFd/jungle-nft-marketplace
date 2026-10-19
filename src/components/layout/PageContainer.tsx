import * as React from 'react'
import { cn } from '@/lib/utils'

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'main' | 'header' | 'footer'
}

/** Largura máxima ~1280px com paddings para 390 / 768 / 1440. */
export function PageContainer({ as: Tag = 'div', className, ...props }: PageContainerProps) {
  return <Tag className={cn('mx-auto w-full max-w-[1280px] px-[30px] md:px-[72px] xl:px-[115px] 2xl:px-0', className)} {...props} />
}

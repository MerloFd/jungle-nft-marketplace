import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'flex h-12 w-full min-w-0 rounded-xl border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground',
      'focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'aria-[invalid=true]:border-destructive-text',
      'file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'

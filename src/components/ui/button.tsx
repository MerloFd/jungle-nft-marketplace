import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        outline: 'border-2 border-brand bg-transparent text-foreground hover:bg-brand/15',
        ghost: 'bg-transparent text-foreground hover:bg-accent',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'h-auto px-0 text-accent-text underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm [&_svg]:size-4',
        default: 'h-11 px-5 text-base [&_svg]:size-5',
        lg: 'h-14 px-8 text-base [&_svg]:size-5',
        icon: 'size-11 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Mostra spinner, desabilita o botão e marca aria-busy. */
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, type, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size }), className)
    if (asChild) {
      return (
        <Slot ref={ref} className={classes} aria-busy={loading || undefined} {...props}>
          {children}
        </Slot>
      )
    }
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Spinner /> : null}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'

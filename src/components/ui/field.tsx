import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'

/** Props de acessibilidade injetadas no controle do campo. */
export interface FieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
  'aria-required'?: true
}

export interface FieldProps {
  label: React.ReactNode
  /** id do controle. Gerado automaticamente se omitido. */
  id?: string
  hint?: React.ReactNode
  /** Mensagem de erro. Quando presente, marca aria-invalid e é anunciada (role="alert"). */
  error?: string | null
  required?: boolean
  /** Esconde o label visualmente (continua disponível para leitores de tela). */
  hideLabel?: boolean
  className?: string
  /**
   * Um único elemento (Input, Textarea, SelectTrigger, Checkbox...) que recebe as props via cloneElement,
   * ou uma render prop `(props) => ReactNode` para controles compostos.
   */
  children: React.ReactElement<Partial<FieldControlProps>> | ((props: FieldControlProps) => React.ReactNode)
}

export function Field({ label, id, hint, error, required, hideLabel, className, children }: FieldProps) {
  const autoId = React.useId()
  const controlId = id ?? `field-${autoId}`
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const controlProps: FieldControlProps = {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    'aria-required': required ? true : undefined,
  }

  let control: React.ReactNode
  if (typeof children === 'function') {
    control = children(controlProps)
  } else {
    const existing = children.props['aria-describedby']
    control = React.cloneElement(children, {
      ...controlProps,
      'aria-describedby': [existing, describedBy].filter(Boolean).join(' ') || undefined,
    })
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={controlId} className={hideLabel ? 'sr-only' : undefined}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-destructive-text">
            *
          </span>
        ) : null}
      </Label>
      {control}
      {hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-destructive-text">
          {error}
        </p>
      ) : null}
    </div>
  )
}

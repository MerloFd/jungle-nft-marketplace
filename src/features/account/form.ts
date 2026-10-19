/** Utilidades de formulário: validação com os schemas do contrato e erros da API por campo. */
import { useCallback, useState } from 'react'
import type { z } from 'zod'
import { isApiError } from '@/lib/http'

export type FieldErrors = Record<string, string>

export function zodErrors(issues: z.core.$ZodIssue[]): FieldErrors {
  const out: FieldErrors = {}
  for (const i of issues) {
    const key = i.path.map(String).join('.') || '_'
    if (!out[key]) out[key] = i.message
  }
  return out
}

/** Converte um erro da API em erros por campo + mensagem geral. */
export function apiErrors(error: unknown, fallback = 'Não foi possível concluir. Tente novamente.'): { fields: FieldErrors; message: string } {
  if (isApiError(error)) return { fields: error.fields ?? {}, message: error.message }
  return { fields: {}, message: fallback }
}

/** Move o foco para o primeiro controle inválido do formulário (após o render). */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    const el = form?.querySelector<HTMLElement>('[aria-invalid="true"]')
    el?.focus()
  })
}

/** Estado simples de formulário com valores tipados. */
export function useFormState<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => {
      if (!e[key as string]) return e
      const { [key as string]: _removed, ...rest } = e
      return rest
    })
  }, [])

  return { values, setValues, set, errors, setErrors, formError, setFormError }
}

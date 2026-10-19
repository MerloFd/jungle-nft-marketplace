import { Toaster as SonnerToaster } from 'sonner'

/** Monte uma vez na raiz. Use `toast` de 'sonner' para disparar. O sonner já anuncia via aria-live. */
export function Toaster() {
  return <SonnerToaster theme="dark" richColors position="top-right" closeButton />
}

export { toast } from 'sonner'

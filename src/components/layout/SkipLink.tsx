export function SkipLink({ targetId = 'main' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only-focusable fixed left-4 top-4 z-[100] rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"
    >
      Pular para o conteúdo
    </a>
  )
}

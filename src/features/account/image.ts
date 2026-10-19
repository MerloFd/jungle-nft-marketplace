/**
 * Redimensionamento de avatar no cliente.
 *
 * Por que no cliente: a API recebe o avatar como data URL (`AvatarUpdateInput`),
 * não existe servidor de imagem para gerar thumbnails e o handler recusa acima de
 * ~1MB. Reduzir para 256px no maior lado antes de enviar mantém o payload pequeno
 * (alguns KB), evita 422 por tamanho e deixa a imagem já no formato em que será
 * exibida (32-96px no cabeçalho e no perfil).
 *
 * As funções aqui não dependem de React: recebem um `File` e devolvem o data URL,
 * o que as torna testáveis isoladamente.
 */

/** Maior lado do avatar enviado à API. */
export const AVATAR_MAX_SIDE = 256

/** Limite do arquivo escolhido pelo usuário (antes do redimensionamento). */
export const AVATAR_MAX_FILE_BYTES = 8 * 1024 * 1024

export const AVATAR_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export const AVATAR_ACCEPT_ATTR = AVATAR_ACCEPTED_TYPES.join(',')

/** Erro com mensagem já pronta para a interface (campo do formulário). */
export class ImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageError'
  }
}

function isAcceptedType(type: string): boolean {
  return (AVATAR_ACCEPTED_TYPES as readonly string[]).includes(type)
}

/** Valida tipo e tamanho do arquivo escolhido. Lança `ImageError` com a mensagem da UI. */
export function validateAvatarFile(file: File): void {
  if (!isAcceptedType(file.type)) {
    throw new ImageError('Formato não suportado. Escolha um arquivo PNG, JPEG ou WebP.')
  }
  if (file.size > AVATAR_MAX_FILE_BYTES) {
    throw new ImageError('Imagem muito grande. Escolha um arquivo de até 8MB.')
  }
}

/** Dimensões finais mantendo a proporção, com o maior lado em no máximo `maxSide`. */
export function fitWithin(width: number, height: number, maxSide = AVATAR_MAX_SIDE): { width: number; height: number } {
  const largest = Math.max(width, height)
  if (largest <= maxSide) return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) }
  const ratio = maxSide / largest
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) }
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  // createImageBitmap é o caminho rápido (sem layout); <img> é o fallback.
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() }
    } catch {
      /* formato não suportado pelo decoder: tenta via <img> */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new ImageError('Não foi possível ler a imagem. Tente outro arquivo.'))
      el.src = url
    })
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

/**
 * Lê o arquivo, reduz para no máximo `AVATAR_MAX_SIDE` no maior lado e devolve
 * um data URL `image/webp` (ou `image/jpeg` quando o browser não exporta WebP).
 */
export async function resizeAvatarToDataUrl(file: File, maxSide = AVATAR_MAX_SIDE, quality = 0.85): Promise<string> {
  validateAvatarFile(file)
  const { source, width, height, release } = await decode(file)
  try {
    if (!width || !height) throw new ImageError('Não foi possível ler a imagem. Tente outro arquivo.')
    const size = fitWithin(width, height, maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ImageError('Não foi possível processar a imagem neste navegador.')
    ctx.drawImage(source, 0, 0, size.width, size.height)
    const webp = canvas.toDataURL('image/webp', quality)
    // Browsers sem suporte a WebP devolvem PNG silenciosamente: cai para JPEG.
    const dataUrl = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality)
    if (!dataUrl.startsWith('data:image/')) throw new ImageError('Não foi possível processar a imagem neste navegador.')
    return dataUrl
  } finally {
    release()
  }
}

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface NftGalleryProps {
  images: { src: string; alt: string }[]
}

/**
 * Galeria com imagem principal e miniaturas. As miniaturas são botões reais
 * (Tab/Enter/Espaço funcionam) e a área da imagem tem proporção fixa para
 * não causar layout shift enquanto carrega.
 */
export function NftGallery({ images }: NftGalleryProps) {
  const [index, setIndex] = React.useState(0)
  const current = images[Math.min(index, images.length - 1)]

  return (
    <div data-testid="nft-gallery" className="flex flex-col gap-3">
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted">
        <img
          src={current.src}
          alt={current.alt}
          width={640}
          height={640}
          decoding="async"
          className="size-full object-cover"
        />
      </div>

      {images.length > 1 ? (
        <ul aria-label="Imagens do NFT" className="flex gap-3 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <li key={`${image.src}-${i}`}>
              <button
                type="button"
                data-testid={`nft-gallery-thumb-${i}`}
                aria-label={`Ver imagem ${i + 1} de ${images.length}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => setIndex(i)}
                className={cn(
                  'block size-20 shrink-0 overflow-hidden rounded-xl border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  i === index ? 'border-brand' : 'border-border hover:border-border-strong',
                )}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  width={80}
                  height={80}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

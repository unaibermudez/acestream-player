import { useState } from 'react'
import { logoFit, type LogoFit } from '../../lib/logo'

function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}+ ]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  return (
    words
      .slice(0, 2)
      .map((w) => w[0])
      .join('') || '?'
  )
}

type LogoState = 'loading' | 'failed' | LogoFit

/**
 * Placa del logo. Mientras carga, o si falla, muestra las iniciales en serif; el fondo negro
 * (necesario para logos claros con transparencia) solo aparece cuando la imagen ha cargado.
 * El tamaño depende de la imagen: los carteles llenan la placa y los iconos pequeños llevan aire.
 */
export function ChannelLogo({ src, name }: { src: string | null; name: string }) {
  const [state, setState] = useState<LogoState>('loading')
  const showImage = src !== null && state !== 'failed'
  const loaded = state !== 'loading' && state !== 'failed'

  return (
    <span
      className={`plate${loaded && showImage ? ` plate--loaded plate--${state}` : ''}`}
      aria-hidden="true"
    >
      {!loaded && <span className="plate__initials">{initials(name)}</span>}
      {showImage && (
        <img
          src={src}
          alt=""
          width="160"
          height="100"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={(e) =>
            setState(logoFit(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight))
          }
          onError={() => setState('failed')}
        />
      )}
    </span>
  )
}

import { useState } from 'react'

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

type LogoState = 'loading' | 'loaded' | 'failed'

/**
 * Placa del logo. Mientras carga, o si falla, muestra las iniciales en serif; el fondo negro
 * (necesario para logos claros con transparencia) solo aparece cuando la imagen ha cargado.
 */
export function ChannelLogo({ src, name }: { src: string | null; name: string }) {
  const [state, setState] = useState<LogoState>('loading')
  const showImage = src !== null && state !== 'failed'

  return (
    <span
      className={`plate${state === 'loaded' && showImage ? ' plate--loaded' : ''}`}
      aria-hidden="true"
    >
      {state !== 'loaded' && <span className="plate__initials">{initials(name)}</span>}
      {showImage && (
        <img
          src={src}
          alt=""
          width="160"
          height="100"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setState('loaded')}
          onError={() => setState('failed')}
        />
      )}
    </span>
  )
}

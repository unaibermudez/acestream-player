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
      .join('')
      .toUpperCase() || '?'
  )
}

type LogoState = 'loading' | 'loaded' | 'failed'

/**
 * Logo remoto del canal. Mientras carga, o si falla, se ven las iniciales; el fondo blanco
 * (necesario para logos oscuros con transparencia) solo aparece cuando la imagen ha cargado.
 */
export function ChannelLogo({ src, name }: { src: string | null; name: string }) {
  const [state, setState] = useState<LogoState>('loading')
  const showImage = src !== null && state !== 'failed'

  return (
    <span
      className={`channel-logo${state === 'loaded' && showImage ? ' channel-logo--loaded' : ''}`}
      aria-hidden="true"
    >
      {state !== 'loaded' && <span className="channel-logo__initials">{initials(name)}</span>}
      {showImage && (
        <img
          src={src}
          alt=""
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

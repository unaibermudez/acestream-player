import { memo } from 'react'
import type { Channel, ChannelVariant } from '../../types/catalog'
import { Chip } from '../ui/Button'
import { ChannelLogo } from './ChannelLogo'

interface Props {
  channel: Channel
  activeContentId: string | null
  onPlay(channel: Channel, variant: ChannelVariant): void
}

/** Las primeras fuentes se muestran como botones; el resto se resume en "+N". */
const VISIBLE_SOURCES = 2

/**
 * Tarjeta de canal: la placa reproduce la mejor fuente; las píldoras, una fuente concreta.
 * Memoizada: las estanterías pueden tener muchas y solo cambian al cambiar el canal activo.
 */
export const ChannelTile = memo(function ChannelTile({ channel, activeContentId, onPlay }: Props) {
  const best = channel.variants[0]
  if (!best) return null
  const active = channel.variants.some((v) => v.contentId === activeContentId)
  const hidden = channel.variants.length - VISIBLE_SOURCES

  return (
    <li className={`tile${active ? ' tile--active' : ''}`}>
      <button
        type="button"
        className="tile__main"
        onClick={() => onPlay(channel, best)}
        aria-label={`Reproducir ${channel.name}`}
      >
        <ChannelLogo src={channel.logo} name={channel.name} />
        <span className="tile__name" translate="no">
          {channel.name}
        </span>
        {active && <span className="tile__now">Reproduciendo</span>}
      </button>
      {channel.variants.length > 1 && (
        <div className="tile__sources" role="group" aria-label={`Fuentes de ${channel.name}`}>
          {channel.variants.slice(0, VISIBLE_SOURCES).map((variant) => (
            <Chip
              key={variant.contentId}
              tone="data"
              pressed={variant.contentId === activeContentId}
              onClick={() => onPlay(channel, variant)}
              title={variant.title}
            >
              {variant.label}
            </Chip>
          ))}
          {hidden > 0 && (
            <span className="tile__more" title="Más fuentes en el reproductor">
              +{hidden}
            </span>
          )}
        </div>
      )}
    </li>
  )
})

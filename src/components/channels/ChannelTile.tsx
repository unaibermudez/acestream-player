import { memo } from 'react'
import type { Channel, ChannelVariant } from '../../types/catalog'
import { HeartIcon } from '../icons'
import { Chip } from '../ui/Button'
import { ChannelLogo } from './ChannelLogo'

interface Props {
  channel: Channel
  activeContentId: string | null
  favorite: boolean
  /** `auto`: la placa deja que la app elija la fuente con más peers; las píldoras, no. */
  onPlay(channel: Channel, variant: ChannelVariant, auto: boolean): void
  onToggleFavorite(channel: Channel): void
}

/** Las primeras fuentes se muestran como botones; el resto se resume en "+N". */
const VISIBLE_SOURCES = 2

/**
 * Tarjeta de canal: la placa reproduce la mejor fuente; las píldoras, una fuente concreta.
 * Memoizada: las estanterías pueden tener muchas y solo cambian al cambiar el canal activo.
 */
export const ChannelTile = memo(function ChannelTile({
  channel,
  activeContentId,
  favorite,
  onPlay,
  onToggleFavorite,
}: Props) {
  const best = channel.variants[0]
  if (!best) return null
  const active = channel.variants.some((v) => v.contentId === activeContentId)
  const hidden = channel.variants.length - VISIBLE_SOURCES

  return (
    <li className={`tile${active ? ' tile--active' : ''}${favorite ? ' tile--favorite' : ''}`}>
      <button
        type="button"
        className="tile__main"
        onClick={() => onPlay(channel, best, true)}
        aria-label={`Reproducir ${channel.name}`}
      >
        <ChannelLogo src={channel.logo} name={channel.name} />
        <span className="tile__name" translate="no">
          {channel.name}
        </span>
        {active && <span className="tile__now">Reproduciendo</span>}
      </button>
      <button
        type="button"
        className="tile__fav"
        aria-pressed={favorite}
        aria-label={
          favorite ? `Quitar ${channel.name} de favoritos` : `Añadir ${channel.name} a favoritos`
        }
        title={favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        onClick={() => onToggleFavorite(channel)}
      >
        <HeartIcon filled={favorite} width={16} height={16} />
      </button>
      {channel.variants.length > 1 && (
        <div className="tile__sources" role="group" aria-label={`Fuentes de ${channel.name}`}>
          {channel.variants.slice(0, VISIBLE_SOURCES).map((variant) => (
            <Chip
              key={variant.contentId}
              tone="data"
              pressed={variant.contentId === activeContentId}
              onClick={() => onPlay(channel, variant, false)}
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

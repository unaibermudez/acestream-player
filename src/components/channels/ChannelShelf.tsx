import { useEffect, useRef, useState } from 'react'
import type { Channel, ChannelVariant } from '../../types/catalog'
import { ChevronLeftIcon, ChevronRightIcon } from '../icons'
import { IconButton } from '../ui/Button'
import { ChannelTile } from './ChannelTile'

interface Props {
  id: string
  title: string
  note: string
  channels: Channel[]
  activeContentId: string | null
  favorites: ReadonlySet<string>
  onPlay(channel: Channel, variant: ChannelVariant, auto: boolean): void
  onToggleFavorite(channel: Channel): void
}

/** Estantería horizontal: scroll con el dedo o la rueda, y flechas en pantallas con ratón. */
export function ChannelShelf({
  id,
  title,
  note,
  channels,
  activeContentId,
  favorites,
  onPlay,
  onToggleFavorite,
}: Props) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    // Las lecturas de layout van en eventos, no durante el render.
    const update = () => {
      const max = track.scrollWidth - track.clientWidth
      setEdges({ start: track.scrollLeft <= 4, end: track.scrollLeft >= max - 4 })
    }
    update()
    track.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(track)
    return () => {
      track.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [channels.length])

  function page(direction: 1 | -1) {
    const track = trackRef.current
    if (!track) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollBy({
      left: direction * track.clientWidth * 0.85,
      behavior: reduce ? 'auto' : 'smooth',
    })
  }

  const headingId = `${id}-title`

  return (
    <section className="shelf" id={id} aria-labelledby={headingId}>
      <header className="shelf__head">
        <h2 className="shelf__title" id={headingId}>
          {title}
        </h2>
        <span className="shelf__note">{note}</span>
        <div className="shelf__arrows">
          <IconButton
            variant="outline"
            label={`Anteriores en ${title}`}
            onClick={() => page(-1)}
            disabled={edges.start}
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            variant="outline"
            label={`Siguientes en ${title}`}
            onClick={() => page(1)}
            disabled={edges.end}
          >
            <ChevronRightIcon />
          </IconButton>
        </div>
      </header>
      <ul className="shelf__track" ref={trackRef}>
        {channels.map((channel) => (
          <ChannelTile
            key={channel.key}
            channel={channel}
            activeContentId={activeContentId}
            favorite={favorites.has(channel.key)}
            onPlay={onPlay}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </ul>
    </section>
  )
}

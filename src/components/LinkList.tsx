import type { LinkPatch } from '../hooks/useLinks'
import type { StreamLink } from '../types/stream'
import { LinkItem } from './LinkItem'

interface Props {
  links: StreamLink[]
  totalCount: number
  activeId: string | null
  onPlay(link: StreamLink): void
  onUpdate(id: string, patch: LinkPatch): void
  onRemove(link: StreamLink): void
}

export function LinkList({ links, totalCount, activeId, onPlay, onUpdate, onRemove }: Props) {
  if (totalCount === 0) {
    return (
      <p className="empty">
        Aún no hay links. Pega un <code>acestream://…</code> arriba para empezar.
      </p>
    )
  }
  if (links.length === 0) {
    return <p className="empty">Ningún link coincide con los filtros.</p>
  }
  return (
    <ul className="link-list" aria-label="Links guardados">
      {links.map((link) => (
        <LinkItem
          key={link.id}
          link={link}
          active={link.id === activeId}
          onPlay={onPlay}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}
    </ul>
  )
}

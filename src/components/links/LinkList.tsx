import type { LinkPatch } from '../../hooks/useLinks'
import type { StreamLink } from '../../types/stream'
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
      <p className="links-empty">
        Aún no tienes links guardados. Pega un <code>acestream://…</code> en el formulario, o guarda
        un canal desde el reproductor.
      </p>
    )
  }
  if (links.length === 0) {
    return <p className="links-empty">Ningún link coincide con los filtros. Prueba a quitarlos.</p>
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

import { memo, useState, type FormEvent } from 'react'
import { formatRelative } from '../../lib/format'
import { parseTagsInput } from '../../lib/links'
import type { LinkPatch } from '../../hooks/useLinks'
import type { StreamLink } from '../../types/stream'
import { EditIcon, StarIcon, TrashIcon } from '../icons'
import { Button, IconButton } from '../ui/Button'

interface Props {
  link: StreamLink
  active: boolean
  onPlay(link: StreamLink): void
  onUpdate(id: string, patch: LinkPatch): void
  onRemove(link: StreamLink): void
}

export const LinkItem = memo(function LinkItem({
  link,
  active,
  onPlay,
  onUpdate,
  onRemove,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(link.name)
  const [tags, setTags] = useState(link.tags.join(', '))

  function startEditing() {
    setName(link.name)
    setTags(link.tags.join(', '))
    setEditing(true)
  }

  function handleSave(event: FormEvent) {
    event.preventDefault()
    onUpdate(link.id, { name: name.trim() || link.name, tags: parseTagsInput(tags) })
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="link-row link-row--editing">
        <form
          className="link-row__edit"
          onSubmit={handleSave}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              setEditing(false)
            }
          }}
        >
          <label className="field-stack">
            Nombre
            <input
              className="field"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              // Foco justificado: el usuario acaba de pulsar "Editar" en esta fila.
              autoFocus
            />
          </label>
          <label className="field-stack">
            Etiquetas
            <input
              className="field"
              name="tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="deportes, cine…"
              autoComplete="off"
            />
          </label>
          <div className="link-row__edit-actions">
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar cambios
            </Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className={`link-row${active ? ' link-row--active' : ''}`}>
      <IconButton
        className="link-row__star"
        aria-pressed={link.favorite}
        label={link.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
        onClick={() => onUpdate(link.id, { favorite: !link.favorite })}
      >
        <StarIcon filled={link.favorite} />
      </IconButton>

      <button
        type="button"
        className="link-row__main"
        onClick={() => onPlay(link)}
        aria-current={active ? 'true' : undefined}
        aria-label={`Reproducir ${link.name}`}
      >
        <span className="link-row__name">{link.name}</span>
        <span className="link-row__meta">
          {link.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
          <span className="link-row__played">
            {active ? 'Reproduciendo' : `Visto ${formatRelative(link.lastPlayedAt)}`}
          </span>
        </span>
      </button>

      <div className="link-row__actions">
        <IconButton label={`Editar ${link.name}`} onClick={startEditing}>
          <EditIcon />
        </IconButton>
        <IconButton variant="danger" label={`Borrar ${link.name}`} onClick={() => onRemove(link)}>
          <TrashIcon />
        </IconButton>
      </div>
    </li>
  )
})

import { useState, type FormEvent } from 'react'
import { formatRelative } from '../lib/format'
import { parseTagsInput } from '../lib/links'
import type { LinkPatch } from '../hooks/useLinks'
import type { StreamLink } from '../types/stream'
import { EditIcon, StarIcon, TrashIcon } from './icons'

interface Props {
  link: StreamLink
  active: boolean
  onPlay(link: StreamLink): void
  onUpdate(id: string, patch: LinkPatch): void
  onRemove(link: StreamLink): void
}

export function LinkItem({ link, active, onPlay, onUpdate, onRemove }: Props) {
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
      <li className="link-item link-item--editing">
        <form
          className="link-item__edit"
          onSubmit={handleSave}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              setEditing(false)
            }
          }}
        >
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Nombre"
            autoFocus
          />
          <input
            className="input"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            aria-label="Etiquetas separadas por comas"
            placeholder="Etiquetas, separadas por comas"
          />
          <div className="link-item__edit-actions">
            <button type="button" className="button" onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button type="submit" className="button button--primary">
              Guardar
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className={`link-item${active ? ' link-item--active' : ''}`}>
      <button
        type="button"
        className="icon-button link-item__star"
        aria-pressed={link.favorite}
        aria-label={link.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
        title={link.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
        onClick={() => onUpdate(link.id, { favorite: !link.favorite })}
      >
        <StarIcon filled={link.favorite} />
      </button>

      <button
        type="button"
        className="link-item__main"
        onClick={() => onPlay(link)}
        aria-current={active ? 'true' : undefined}
        title={`Reproducir ${link.name}`}
      >
        <span className="link-item__name">{link.name}</span>
        <span className="link-item__meta">
          {link.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
          <span className="link-item__played">Visto {formatRelative(link.lastPlayedAt)}</span>
        </span>
      </button>

      <div className="link-item__actions">
        <button
          type="button"
          className="icon-button"
          aria-label={`Editar ${link.name}`}
          title="Editar"
          onClick={startEditing}
        >
          <EditIcon />
        </button>
        <button
          type="button"
          className="icon-button icon-button--danger"
          aria-label={`Borrar ${link.name}`}
          title="Borrar"
          onClick={() => onRemove(link)}
        >
          <TrashIcon />
        </button>
      </div>
    </li>
  )
}

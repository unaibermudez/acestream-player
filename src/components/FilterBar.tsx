import type { RefObject } from 'react'
import type { LinkFilter } from '../lib/filter'
import { StarIcon } from './icons'

interface Props {
  filter: LinkFilter
  tags: string[]
  searchRef: RefObject<HTMLInputElement | null>
  onChange(filter: LinkFilter): void
}

export function FilterBar({ filter, tags, searchRef, onChange }: Props) {
  return (
    <div className="filter-bar">
      <input
        ref={searchRef}
        type="search"
        className="input"
        value={filter.query}
        onChange={(event) => onChange({ ...filter, query: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && filter.query) {
            event.stopPropagation()
            onChange({ ...filter, query: '' })
          }
        }}
        placeholder="Buscar  ( / )"
        aria-label="Buscar links"
        autoComplete="off"
      />
      <div className="filter-bar__chips" role="group" aria-label="Filtros">
        <button
          type="button"
          className="chip"
          aria-pressed={filter.favoritesOnly}
          onClick={() => onChange({ ...filter, favoritesOnly: !filter.favoritesOnly })}
        >
          <StarIcon filled={filter.favoritesOnly} width={14} height={14} /> Favoritos
        </button>
        {tags.map((tag) => {
          const active = filter.tag?.toLowerCase() === tag.toLowerCase()
          return (
            <button
              key={tag}
              type="button"
              className="chip"
              aria-pressed={active}
              onClick={() => onChange({ ...filter, tag: active ? null : tag })}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}

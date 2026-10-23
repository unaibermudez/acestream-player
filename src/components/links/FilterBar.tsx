import type { RefObject } from 'react'
import type { LinkFilter } from '../../lib/filter'
import { SearchIcon, StarIcon } from '../icons'
import { Chip } from '../ui/Button'

interface Props {
  filter: LinkFilter
  tags: string[]
  searchRef: RefObject<HTMLInputElement | null>
  onChange(filter: LinkFilter): void
}

export function FilterBar({ filter, tags, searchRef, onChange }: Props) {
  return (
    <div className="filter-bar">
      <label className="search">
        <SearchIcon className="search__icon" />
        <span className="visually-hidden">Buscar en mis links</span>
        <input
          ref={searchRef}
          type="search"
          name="q"
          className="search__input"
          value={filter.query}
          onChange={(event) => onChange({ ...filter, query: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && filter.query) {
              event.stopPropagation()
              onChange({ ...filter, query: '' })
            }
          }}
          placeholder="Buscar por nombre o etiqueta…"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        <kbd className="search__kbd" aria-hidden="true">
          /
        </kbd>
      </label>
      <div className="filter-bar__chips" role="group" aria-label="Filtros">
        <Chip
          pressed={filter.favoritesOnly}
          onClick={() => onChange({ ...filter, favoritesOnly: !filter.favoritesOnly })}
        >
          <StarIcon filled={filter.favoritesOnly} width={14} height={14} /> Favoritos
        </Chip>
        {tags.map((tag) => {
          const active = filter.tag?.toLowerCase() === tag.toLowerCase()
          return (
            <Chip
              key={tag}
              pressed={active}
              onClick={() => onChange({ ...filter, tag: active ? null : tag })}
            >
              {tag}
            </Chip>
          )
        })}
      </div>
    </div>
  )
}

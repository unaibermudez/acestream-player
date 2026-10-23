import { useMemo, useState, type RefObject } from 'react'
import type { LinkPatch } from '../../hooks/useLinks'
import type { AdditionPlan } from '../../lib/links'
import { collectTags, EMPTY_FILTER, filterLinks, type LinkFilter } from '../../lib/filter'
import type { ParsedEntry, StreamLink } from '../../types/stream'
import { AddLinksForm } from './AddLinksForm'
import { FilterBar } from './FilterBar'
import { LinkList } from './LinkList'
import './links.css'

interface Props {
  links: StreamLink[]
  loaded: boolean
  activeId: string | null
  searchRef: RefObject<HTMLInputElement | null>
  onAdd(entries: ParsedEntry[]): AdditionPlan
  onPlay(link: StreamLink): void
  onUpdate(id: string, patch: LinkPatch): void
  onRemove(link: StreamLink): void
}

/** "Mis links": formulario de alta a la izquierda y la lista filtrable a la derecha. */
export function LinksView({
  links,
  loaded,
  activeId,
  searchRef,
  onAdd,
  onPlay,
  onUpdate,
  onRemove,
}: Props) {
  const [filter, setFilter] = useState<LinkFilter>(EMPTY_FILTER)
  const tags = useMemo(() => collectTags(links), [links])
  const visible = useMemo(() => filterLinks(links, filter), [links, filter])

  return (
    <div className="links-view">
      <header className="links-view__head">
        <h1 className="page-title">Mis links</h1>
        <p className="links-view__summary">
          {links.length} {links.length === 1 ? 'guardado' : 'guardados'}
        </p>
      </header>

      <div className="links-view__grid">
        <aside className="links-view__aside">
          <AddLinksForm onAdd={onAdd} />
        </aside>
        <div className="links-view__list">
          <FilterBar filter={filter} tags={tags} searchRef={searchRef} onChange={setFilter} />
          {loaded && (
            <LinkList
              links={visible}
              totalCount={links.length}
              activeId={activeId}
              onPlay={onPlay}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          )}
        </div>
      </div>
    </div>
  )
}

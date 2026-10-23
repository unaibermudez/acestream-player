import { useCallback, useMemo, useRef, useState } from 'react'
import { AddLinksForm } from './components/AddLinksForm'
import { FilterBar } from './components/FilterBar'
import { LinkList } from './components/LinkList'
import { Player } from './components/Player'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useLinks } from './hooks/useLinks'
import { collectTags, EMPTY_FILTER, filterLinks, type LinkFilter } from './lib/filter'
import type { StreamLink } from './types/stream'

export default function App() {
  const { links, loaded, addEntries, updateLink, removeLink, markPlayed } = useLinks()
  const [filter, setFilter] = useState<LinkFilter>(EMPTY_FILTER)
  const [activeId, setActiveId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const tags = useMemo(() => collectTags(links), [links])
  const visible = useMemo(() => filterLinks(links, filter), [links, filter])
  const active = links.find((link) => link.id === activeId) ?? null

  const play = useCallback(
    (link: StreamLink) => {
      setActiveId(link.id)
      markPlayed(link.id)
    },
    [markPlayed],
  )

  const remove = useCallback(
    (link: StreamLink) => {
      if (!window.confirm(`¿Borrar «${link.name}»?`)) return
      if (link.id === activeId) setActiveId(null)
      removeLink(link.id)
    },
    [activeId, removeLink],
  )

  useKeyboardShortcuts({
    onFocusSearch: () => searchRef.current?.focus(),
    onEscape: () => setActiveId(null),
  })

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-header__title">Acestream Player</h1>
      </header>

      <main className={`app-main${active ? ' app-main--playing' : ''}`}>
        <section className="player-pane" aria-label="Reproductor">
          {active ? (
            <Player key={active.id} link={active} onClose={() => setActiveId(null)} />
          ) : (
            <div className="player-placeholder">Elige un link de la lista para reproducirlo.</div>
          )}
        </section>

        <section className="library-pane" aria-label="Biblioteca">
          <AddLinksForm onAdd={addEntries} />
          <FilterBar filter={filter} tags={tags} searchRef={searchRef} onChange={setFilter} />
          {loaded && (
            <LinkList
              links={visible}
              totalCount={links.length}
              activeId={activeId}
              onPlay={play}
              onUpdate={updateLink}
              onRemove={remove}
            />
          )}
        </section>
      </main>
    </div>
  )
}

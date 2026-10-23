import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AddLinksForm } from './components/AddLinksForm'
import { EngineStatusBadge } from './components/EngineStatusBadge'
import { FilterBar } from './components/FilterBar'
import { ImportExport } from './components/ImportExport'
import { LinkList } from './components/LinkList'
import { Player } from './components/Player'
import { useEngineStatus } from './hooks/useEngineStatus'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useLinks } from './hooks/useLinks'
import { parseImport } from './lib/exchange'
import { collectTags, EMPTY_FILTER, filterLinks, type LinkFilter } from './lib/filter'
import type { StreamLink } from './types/stream'

interface Notice {
  kind: 'ok' | 'warn' | 'error'
  text: string
}

export default function App() {
  const { links, loaded, addEntries, updateLink, removeLink, markPlayed, mergeLinks } = useLinks()
  const engine = useEngineStatus()
  const [filter, setFilter] = useState<LinkFilter>(EMPTY_FILTER)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const tags = useMemo(() => collectTags(links), [links])
  const visible = useMemo(() => filterLinks(links, filter), [links, filter])
  const active = links.find((link) => link.id === activeId) ?? null

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 8000)
    return () => window.clearTimeout(id)
  }, [notice])

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

  const importText = useCallback(
    (text: string, fileName: string) => {
      const payload = parseImport(text)
      if (payload.kind === 'error') {
        setNotice({ kind: 'error', text: `${fileName}: ${payload.message}` })
        return
      }

      let summary: { added: number; duplicates: number; invalid: number }
      if (payload.kind === 'json') {
        summary = { ...mergeLinks(payload.links), invalid: payload.invalid }
      } else {
        const plan = addEntries(payload.result.entries)
        summary = {
          added: plan.toAdd.length,
          duplicates: plan.duplicates.length,
          invalid: payload.result.errors.length,
        }
      }

      const parts = [`${summary.added} añadidos`]
      if (summary.duplicates) parts.push(`${summary.duplicates} duplicados ignorados`)
      if (summary.invalid) parts.push(`${summary.invalid} entradas no válidas`)
      setNotice({
        kind: summary.added > 0 && !summary.invalid ? 'ok' : 'warn',
        text: `Importado ${fileName}: ${parts.join(', ')}.`,
      })
    },
    [addEntries, mergeLinks],
  )

  useKeyboardShortcuts({
    onFocusSearch: () => searchRef.current?.focus(),
    onEscape: () => setActiveId(null),
  })

  return (
    <div className="app">
      <header className="app-header">
        <img className="app-header__logo" src="/icon.svg" alt="" width="28" height="28" />
        <h1 className="app-header__title">Acestream Player</h1>
        <EngineStatusBadge status={engine} />
        <span className="app-header__spacer" />
        <ImportExport links={links} onImportText={importText} />
      </header>

      {notice && (
        <div className={`notice notice--${notice.kind}`} role="status">
          <span>{notice.text}</span>
          <button
            type="button"
            className="notice__close"
            onClick={() => setNotice(null)}
            aria-label="Cerrar aviso"
          >
            ×
          </button>
        </div>
      )}

      <main className={`app-main${active ? ' app-main--playing' : ''}`}>
        <section className="player-pane" aria-label="Reproductor">
          {active ? (
            <Player key={active.id} link={active} onClose={() => setActiveId(null)} />
          ) : (
            <div className="player-placeholder">
              <p>
                Elige un link de la lista para reproducirlo.
                <br />
                <kbd>/</kbd> busca · <kbd>Esc</kbd> cierra el reproductor
              </p>
            </div>
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

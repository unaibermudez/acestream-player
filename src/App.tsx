import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AddLinksForm } from './components/AddLinksForm'
import { ChannelsView } from './components/ChannelsView'
import { EngineStatusBadge } from './components/EngineStatusBadge'
import { FilterBar } from './components/FilterBar'
import { ImportExport } from './components/ImportExport'
import { LinkList } from './components/LinkList'
import { Player, type PlayerSource } from './components/Player'
import { useCatalog } from './hooks/useCatalog'
import { useEngineStatus } from './hooks/useEngineStatus'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useLinks } from './hooks/useLinks'
import { parseImport } from './lib/exchange'
import { collectTags, EMPTY_FILTER, filterLinks, type LinkFilter } from './lib/filter'
import type { Channel, ChannelVariant } from './types/catalog'
import type { StreamLink } from './types/stream'

interface Notice {
  kind: 'ok' | 'warn' | 'error'
  text: string
}

type View = 'channels' | 'links'

/** Lo que está sonando: un link guardado o una fuente concreta de un canal del catálogo. */
type Playing =
  { kind: 'link'; linkId: string } | { kind: 'channel'; channel: Channel; contentId: string }

const VIEW_KEY = 'acestream-player:view'

function readView(): View {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'links' ? 'links' : 'channels'
  } catch {
    return 'channels'
  }
}

export default function App() {
  const { links, loaded, addEntries, updateLink, removeLink, markPlayed, mergeLinks } = useLinks()
  const catalog = useCatalog()
  const engine = useEngineStatus()
  const [view, setView] = useState<View>(readView)
  const [filter, setFilter] = useState<LinkFilter>(EMPTY_FILTER)
  const [playing, setPlaying] = useState<Playing | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const playerPaneRef = useRef<HTMLElement>(null)

  const tags = useMemo(() => collectTags(links), [links])
  const visible = useMemo(() => filterLinks(links, filter), [links, filter])

  const activeLink =
    playing?.kind === 'link' ? (links.find((link) => link.id === playing.linkId) ?? null) : null
  const activeVariant =
    playing?.kind === 'channel'
      ? (playing.channel.variants.find((v) => v.contentId === playing.contentId) ?? null)
      : null
  const activeContentId = activeLink?.contentId ?? activeVariant?.contentId ?? null

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 8000)
    return () => window.clearTimeout(id)
  }, [notice])

  const changeView = useCallback((next: View) => {
    setView(next)
    try {
      window.localStorage.setItem(VIEW_KEY, next)
    } catch {
      // Preferencia opcional: si no se puede guardar, no pasa nada.
    }
  }, [])

  const revealPlayer = useCallback(() => {
    // En móvil el reproductor está encima de la lista: se sube hasta él.
    if (window.matchMedia('(max-width: 899px)').matches) {
      requestAnimationFrame(() =>
        playerPaneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    }
  }, [])

  const playLink = useCallback(
    (link: StreamLink) => {
      setPlaying({ kind: 'link', linkId: link.id })
      markPlayed(link.id)
      revealPlayer()
    },
    [markPlayed, revealPlayer],
  )

  const playChannel = useCallback(
    (channel: Channel, variant: ChannelVariant) => {
      setPlaying({ kind: 'channel', channel, contentId: variant.contentId })
      revealPlayer()
    },
    [revealPlayer],
  )

  const remove = useCallback(
    (link: StreamLink) => {
      if (!window.confirm(`¿Borrar «${link.name}»?`)) return
      if (playing?.kind === 'link' && playing.linkId === link.id) setPlaying(null)
      removeLink(link.id)
    },
    [playing, removeLink],
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

  const saveChannel = useCallback(() => {
    if (playing?.kind !== 'channel' || !activeVariant) return
    addEntries([
      {
        contentId: activeVariant.contentId,
        name: activeVariant.title,
        tags: [playing.channel.category],
      },
    ])
  }, [playing, activeVariant, addEntries])

  useKeyboardShortcuts({
    onFocusSearch: () => searchRef.current?.focus(),
    onEscape: () => setPlaying(null),
  })

  let player = (
    <div className="player-placeholder">
      <p>
        Elige un {view === 'channels' ? 'canal' : 'link'} para reproducirlo.
        <br />
        <kbd>/</kbd> busca · <kbd>Esc</kbd> cierra el reproductor
      </p>
    </div>
  )
  if (activeLink) {
    player = (
      <Player
        key={activeLink.contentId}
        title={activeLink.name}
        contentId={activeLink.contentId}
        onClose={() => setPlaying(null)}
      />
    )
  } else if (playing?.kind === 'channel' && activeVariant) {
    const sources: PlayerSource[] = playing.channel.variants
    player = (
      // La key por content ID hace que cambiar de fuente destruya la instancia de hls.js anterior.
      <Player
        key={activeVariant.contentId}
        title={`${playing.channel.name} · ${activeVariant.label}`}
        contentId={activeVariant.contentId}
        sources={sources}
        onSelectSource={(source) =>
          setPlaying({ kind: 'channel', channel: playing.channel, contentId: source.contentId })
        }
        onSave={saveChannel}
        saved={links.some((link) => link.contentId === activeVariant.contentId)}
        onClose={() => setPlaying(null)}
      />
    )
  }
  const isPlaying = activeLink !== null || activeVariant !== null

  return (
    <div className="app">
      <header className="app-header">
        <img className="app-header__logo" src="/icon.svg" alt="" width="28" height="28" />
        <h1 className="app-header__title">Acestream Player</h1>
        <EngineStatusBadge status={engine} />
        <span className="app-header__spacer" />
        {view === 'links' && <ImportExport links={links} onImportText={importText} />}
      </header>

      <nav className="tabs" aria-label="Secciones">
        <button
          type="button"
          className="tabs__tab"
          aria-current={view === 'channels' ? 'page' : undefined}
          onClick={() => changeView('channels')}
        >
          Canales
        </button>
        <button
          type="button"
          className="tabs__tab"
          aria-current={view === 'links' ? 'page' : undefined}
          onClick={() => changeView('links')}
        >
          Mis links {links.length > 0 && <span className="tabs__count">{links.length}</span>}
        </button>
      </nav>

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

      <main
        className={`app-main${isPlaying ? ' app-main--playing' : ''}${view === 'channels' ? ' app-main--wide' : ''}`}
      >
        <section className="player-pane" aria-label="Reproductor" ref={playerPaneRef}>
          {player}
        </section>

        <section
          className="library-pane"
          aria-label={view === 'channels' ? 'Canales' : 'Mis links'}
        >
          {view === 'channels' ? (
            <ChannelsView
              categories={catalog.categories}
              source={catalog.source}
              loaded={catalog.loaded}
              activeContentId={activeContentId}
              searchRef={searchRef}
              onPlay={playChannel}
              onImport={(text) => catalog.importText(text)}
              onClear={catalog.clear}
            />
          ) : (
            <>
              <AddLinksForm onAdd={addEntries} />
              <FilterBar filter={filter} tags={tags} searchRef={searchRef} onChange={setFilter} />
              {loaded && (
                <LinkList
                  links={visible}
                  totalCount={links.length}
                  activeId={activeLink?.id ?? null}
                  onPlay={playLink}
                  onUpdate={updateLink}
                  onRemove={remove}
                />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}

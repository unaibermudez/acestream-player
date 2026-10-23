import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChannelsView } from './components/channels/ChannelsView'
import { AppHeader } from './components/layout/AppHeader'
import { Toast, type ToastMessage } from './components/layout/Toast'
import { ImportExport } from './components/links/ImportExport'
import { LinksView } from './components/links/LinksView'
import { Player, type PlayerSource } from './components/player/Player'
import { useCatalog } from './hooks/useCatalog'
import { useEngineStatus } from './hooks/useEngineStatus'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useLinks } from './hooks/useLinks'
import { useRecentChannels } from './hooks/useRecentChannels'
import { useTheme } from './hooks/useTheme'
import { useUrlState } from './hooks/useUrlState'
import { parseImport } from './lib/exchange'
import { defaultName } from './lib/links'
import type { Channel, ChannelVariant } from './types/catalog'
import type { StreamLink } from './types/stream'

interface NowPlaying {
  contentId: string
  title: string
  subtitle?: string
  sources: PlayerSource[]
  /** Nombre y etiquetas con los que se guardaría en "Mis links". */
  save: { name: string; tags: string[] }
}

export default function App() {
  const linksApi = useLinks()
  const { links, addEntries, updateLink, removeLink, restoreLink, markPlayed, mergeLinks } =
    linksApi
  const catalog = useCatalog()
  const engine = useEngineStatus()
  const { theme, toggle: toggleTheme } = useTheme()
  const { recent, remember } = useRecentChannels()
  const url = useUrlState()
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const showToast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    setToast({ ...message, id: Date.now() })
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])

  // Índices del catálogo: content ID → canal y fuente, y clave → canal.
  const { byContentId, byKey } = useMemo(() => {
    const byContentId = new Map<string, { channel: Channel; variant: ChannelVariant }>()
    const byKey = new Map<string, Channel>()
    for (const category of catalog.categories) {
      for (const channel of category.channels) {
        byKey.set(channel.key, channel)
        for (const variant of channel.variants)
          byContentId.set(variant.contentId, { channel, variant })
      }
    }
    return { byContentId, byKey }
  }, [catalog.categories])

  const recentChannels = useMemo(
    () => recent.map((entry) => byKey.get(entry.channelKey)).filter((c): c is Channel => !!c),
    [recent, byKey],
  )

  const playingId = url.state.playing
  const activeLink = playingId ? (links.find((link) => link.contentId === playingId) ?? null) : null

  // Qué se reproduce: un canal del catálogo (con sus fuentes), un link guardado o un ID suelto.
  const nowPlaying: NowPlaying | null = useMemo(() => {
    if (!playingId) return null
    const match = byContentId.get(playingId)
    if (match) {
      return {
        contentId: playingId,
        title: match.channel.name,
        subtitle: match.channel.category,
        sources: match.channel.variants,
        save: { name: match.variant.title, tags: [match.channel.category] },
      }
    }
    if (activeLink) {
      return {
        contentId: playingId,
        title: activeLink.name,
        subtitle: activeLink.tags.join(', ') || undefined,
        sources: [],
        save: { name: activeLink.name, tags: activeLink.tags },
      }
    }
    return {
      contentId: playingId,
      title: defaultName(playingId),
      sources: [],
      save: { name: defaultName(playingId), tags: [] },
    }
  }, [playingId, byContentId, activeLink])

  useEffect(() => {
    document.title = nowPlaying ? `${nowPlaying.title} · Acestream` : 'Acestream Player'
  }, [nowPlaying])

  const revealStage = useCallback(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() =>
      stageRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }),
    )
  }, [])

  const playChannel = useCallback(
    (channel: Channel, variant: ChannelVariant) => {
      url.play(variant.contentId)
      remember(channel.key, variant.contentId)
      revealStage()
    },
    [url, remember, revealStage],
  )

  const playLink = useCallback(
    (link: StreamLink) => {
      url.play(link.contentId)
      markPlayed(link.id)
      revealStage()
    },
    [url, markPlayed, revealStage],
  )

  const selectSource = useCallback(
    (source: PlayerSource) => {
      const match = byContentId.get(source.contentId)
      if (match) remember(match.channel.key, source.contentId)
      url.play(source.contentId)
    },
    [byContentId, remember, url],
  )

  const remove = useCallback(
    (link: StreamLink) => {
      removeLink(link.id)
      showToast({
        kind: 'ok',
        text: `«${link.name}» borrado.`,
        action: { label: 'Deshacer', run: () => restoreLink(link) },
      })
    },
    [removeLink, restoreLink, showToast],
  )

  const save = useCallback(() => {
    if (!nowPlaying) return
    const plan = addEntries([{ contentId: nowPlaying.contentId, ...nowPlaying.save }])
    if (plan.toAdd.length > 0) showToast({ kind: 'ok', text: 'Guardado en Mis links.' })
  }, [nowPlaying, addEntries, showToast])

  const importLinks = useCallback(
    (text: string, fileName: string) => {
      const payload = parseImport(text)
      if (payload.kind === 'error') {
        showToast({ kind: 'error', text: `${fileName}: ${payload.message}` })
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
      if (summary.duplicates) parts.push(`${summary.duplicates} ya estaban`)
      if (summary.invalid) parts.push(`${summary.invalid} no válidos`)
      showToast({
        kind: summary.added > 0 && !summary.invalid ? 'ok' : 'warn',
        text: `${fileName}: ${parts.join(', ')}.`,
      })
    },
    [addEntries, mergeLinks, showToast],
  )

  useKeyboardShortcuts({
    onFocusSearch: () => searchRef.current?.focus(),
    onEscape: () => {
      if (url.state.playing) url.close()
    },
  })

  const view = url.state.view

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <AppHeader
        view={view}
        linkCount={links.length}
        engine={engine}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={url.setView}
        actions={
          view === 'links' ? <ImportExport links={links} onImportText={importLinks} /> : undefined
        }
      />

      <main className="app-main" id="contenido" tabIndex={-1}>
        <div ref={stageRef}>
          {nowPlaying && (
            // La key por content ID hace que cambiar de fuente destruya la instancia de hls.js anterior.
            <Player
              key={nowPlaying.contentId}
              title={nowPlaying.title}
              subtitle={nowPlaying.subtitle}
              contentId={nowPlaying.contentId}
              sources={nowPlaying.sources}
              onSelectSource={selectSource}
              onSave={save}
              saved={links.some((link) => link.contentId === nowPlaying.contentId)}
              onClose={url.close}
            />
          )}
        </div>

        {view === 'channels' ? (
          <ChannelsView
            categories={catalog.categories}
            recent={recentChannels}
            source={catalog.source}
            loaded={catalog.loaded}
            activeContentId={playingId}
            searchRef={searchRef}
            onPlay={playChannel}
            onImport={(text) => catalog.importText(text)}
            onClear={catalog.clear}
          />
        ) : (
          <LinksView
            links={links}
            loaded={linksApi.loaded}
            activeId={activeLink?.id ?? null}
            searchRef={searchRef}
            onAdd={addEntries}
            onPlay={playLink}
            onUpdate={updateLink}
            onRemove={remove}
          />
        )}
      </main>

      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  )
}

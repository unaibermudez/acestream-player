import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChannelsView } from './components/channels/ChannelsView'
import { AppHeader } from './components/layout/AppHeader'
import { Toast, type ToastMessage } from './components/layout/Toast'
import { ImportExport } from './components/links/ImportExport'
import { LinksView } from './components/links/LinksView'
import { Player, type PlayerSource } from './components/player/Player'
import { useCatalog } from './hooks/useCatalog'
import { useEngineStatus } from './hooks/useEngineStatus'
import { useFavorites } from './hooks/useFavorites'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useLinks } from './hooks/useLinks'
import { useRecentChannels } from './hooks/useRecentChannels'
import { useSourceProbe } from './hooks/useSourceProbe'
import { useTheme } from './hooks/useTheme'
import { useUrlState } from './hooks/useUrlState'
import { parseImport } from './lib/exchange'
import { defaultName } from './lib/links'
import type { Channel, ChannelVariant } from './types/catalog'
import type { StreamLink } from './types/stream'

interface NowPlaying {
  contentId: string
  /** Canal del catálogo al que pertenece, si es uno. */
  channelKey?: string
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
  const { favorites, toggle: toggleFavorite } = useFavorites()
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

  const favoriteSet = useMemo(() => new Set(favorites), [favorites])
  const favoriteChannels = useMemo(
    () => favorites.map((key) => byKey.get(key)).filter((c): c is Channel => !!c),
    [favorites, byKey],
  )

  // Último canal visto con la fuente que se usó, para el botón "Seguir con…".
  const resume = useMemo(() => {
    const last = recent[0]
    const channel = last ? byKey.get(last.channelKey) : undefined
    if (!last || !channel) return null
    const variant =
      channel.variants.find((v) => v.contentId === last.contentId) ?? channel.variants[0]
    return variant ? { channel, variant } : null
  }, [recent, byKey])

  const playingId = url.state.playing
  const activeLink = playingId ? (links.find((link) => link.contentId === playingId) ?? null) : null

  // Qué se reproduce: un canal del catálogo (con sus fuentes), un link guardado o un ID suelto.
  const nowPlaying: NowPlaying | null = useMemo(() => {
    if (!playingId) return null
    const match = byContentId.get(playingId)
    if (match) {
      return {
        contentId: playingId,
        channelKey: match.channel.key,
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

  // Elección automática de fuente: al abrir un canal desde su placa se comprueban los peers de
  // todas sus fuentes y se pasa a la mejor. Solo mientras se siga en ese mismo canal.
  const [autoChannel, setAutoChannel] = useState<string | null>(null)
  const probing = autoChannel !== null && autoChannel === nowPlaying?.channelKey
  const probeIds = useMemo(
    () => (probing ? (byKey.get(autoChannel)?.variants.map((v) => v.contentId) ?? null) : null),
    [probing, autoChannel, byKey],
  )
  const probe = useSourceProbe(probeIds)
  const appliedProbe = useRef<string | null>(null)

  useEffect(() => {
    if (!probing || probe.phase !== 'done' || appliedProbe.current === autoChannel) return
    appliedProbe.current = autoChannel
    if (probe.best && probe.best !== playingId) url.play(probe.best)
  }, [probing, probe.phase, probe.best, autoChannel, playingId, url])

  const revealStage = useCallback(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() =>
      stageRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }),
    )
  }, [])

  const playChannel = useCallback(
    (channel: Channel, variant: ChannelVariant, auto: boolean) => {
      appliedProbe.current = null
      setAutoChannel(auto && channel.variants.length > 1 ? channel.key : null)
      url.play(variant.contentId)
      remember(channel.key, variant.contentId)
      revealStage()
    },
    [url, remember, revealStage],
  )

  const toggleChannelFavorite = useCallback(
    (channel: Channel) => toggleFavorite(channel.key),
    [toggleFavorite],
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
      // Elegir a mano manda: si aún se estaban comprobando las fuentes, se deja de hacerlo.
      probe.cancel(source.contentId)
      const match = byContentId.get(source.contentId)
      if (match) remember(match.channel.key, source.contentId)
      url.play(source.contentId)
    },
    [byContentId, remember, url, probe],
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
              checking={probing && probe.phase === 'checking'}
              health={probing ? probe.health : undefined}
              onSkipCheck={() => probe.cancel(nowPlaying.contentId)}
              favorite={nowPlaying.channelKey ? favoriteSet.has(nowPlaying.channelKey) : false}
              onToggleFavorite={
                nowPlaying.channelKey
                  ? () => nowPlaying.channelKey && toggleFavorite(nowPlaying.channelKey)
                  : undefined
              }
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
            favoriteChannels={favoriteChannels}
            favorites={favoriteSet}
            resume={resume}
            source={catalog.source}
            loaded={catalog.loaded}
            activeContentId={playingId}
            searchRef={searchRef}
            onPlay={playChannel}
            onToggleFavorite={toggleChannelFavorite}
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

import { useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react'
import type { CatalogImportResult, CatalogSource } from '../hooks/useCatalog'
import { filterCategories } from '../lib/catalog'
import type { Channel, ChannelCategory, ChannelVariant } from '../types/catalog'
import { ChannelLogo } from './ChannelLogo'
import { UploadIcon } from './icons'

interface Props {
  categories: ChannelCategory[]
  source: CatalogSource
  loaded: boolean
  activeContentId: string | null
  searchRef: RefObject<HTMLInputElement | null>
  onPlay(channel: Channel, variant: ChannelVariant): void
  onImport(text: string, fileName: string): CatalogImportResult
  onClear(): void
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

export function ChannelsView({
  categories,
  source,
  loaded,
  activeContentId,
  searchRef,
  onPlay,
  onImport,
  onClear,
}: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Si se reemplaza el catálogo y la categoría elegida ya no existe, se vuelve a "Todas".
  const selected = category && categories.some((c) => c.name === category) ? category : null
  const visible = useMemo(
    () => filterCategories(categories, query, selected),
    [categories, query, selected],
  )
  const total = categories.reduce((n, c) => n + c.channels.length, 0)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = onImport(await file.text(), file.name)
    setMessage(
      result.ok
        ? {
            kind: 'ok',
            text: `Catálogo cargado: ${plural(result.channels, 'canal', 'canales')} (${plural(result.entries, 'fuente', 'fuentes')})${result.invalid ? `, ${plural(result.invalid, 'entrada no válida', 'entradas no válidas')}` : ''}.`,
          }
        : { kind: 'error', text: `${file.name}: ${result.message}` },
    )
  }

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept=".json,application/json"
      onChange={(event) => void handleFile(event)}
      hidden
    />
  )

  if (!loaded) return null

  if (total === 0) {
    return (
      <div className="panel catalog-empty">
        <h2>Aún no hay catálogo de canales</h2>
        <p>
          Carga un archivo JSON con tus canales. Cada entrada necesita un content ID de 40
          caracteres (<code>hash</code>) y, opcionalmente, <code>title</code>, <code>group</code>{' '}
          (categoría) y <code>logo</code>:
        </p>
        <pre>{`{ "hashes": [
  { "title": "Canal 1080p *", "hash": "<40 hex>",
    "group": "CATEGORÍA", "logo": "https://…" }
] }`}</pre>
        <p className="catalog-empty__hint">
          Las variantes del mismo canal (720p, 1080p, marcas <code>*</code>…) se agrupan solas. Lo
          más cómodo es dejarlo en el servidor como <code>data/catalog.json</code>: se carga solo en
          todos los dispositivos. Si no, puedes cargarlo aquí y se guardará en este navegador.
        </p>
        <button
          type="button"
          className="button button--primary"
          onClick={() => fileRef.current?.click()}
        >
          <UploadIcon /> Cargar catálogo
        </button>
        {message && <p className={`text-${message.kind}`}>{message.text}</p>}
        {fileInput}
      </div>
    )
  }

  return (
    <div className="channels">
      <div className="channels__toolbar">
        <input
          ref={searchRef}
          type="search"
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && query) {
              event.stopPropagation()
              setQuery('')
            }
          }}
          placeholder={`Buscar entre ${plural(total, 'canal', 'canales')}  ( / )`}
          aria-label="Buscar canales"
          autoComplete="off"
        />
        {/* Con catálogo de servidor no se importa en el navegador: se actualiza el archivo. */}
        {source !== 'server' && (
          <>
            <button
              type="button"
              className="button"
              onClick={() => fileRef.current?.click()}
              title="Reemplazar el catálogo por otro archivo JSON"
            >
              <UploadIcon />
              <span className="hide-narrow">Catálogo</span>
            </button>
            {fileInput}
          </>
        )}
      </div>

      <div className="channels__categories" role="group" aria-label="Categorías">
        <button
          type="button"
          className="chip"
          aria-pressed={selected === null}
          onClick={() => setCategory(null)}
        >
          Todas
        </button>
        {categories.map((c) => (
          <button
            key={c.name}
            type="button"
            className="chip"
            aria-pressed={selected === c.name}
            onClick={() => setCategory(selected === c.name ? null : c.name)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {message && (
        <p className={`channels__message text-${message.kind}`} role="status">
          {message.text}
        </p>
      )}

      {visible.length === 0 && <p className="empty">Ningún canal coincide con la búsqueda.</p>}

      {visible.map((c) => (
        <section key={c.name} className="channel-category" aria-label={c.name}>
          <h2 className="channel-category__title">
            {c.name} <span className="channel-category__count">{c.channels.length}</span>
          </h2>
          <ul className="channel-grid">
            {c.channels.map((channel) => (
              <ChannelCard
                key={channel.key}
                channel={channel}
                activeContentId={activeContentId}
                onPlay={onPlay}
              />
            ))}
          </ul>
        </section>
      ))}

      {source === 'server' && (
        <p className="channels__footer">
          Catálogo del servidor (<code>data/catalog.json</code>). Para actualizarlo, sustituye el
          archivo y recarga la página.
        </p>
      )}

      {source === 'local' && (
        <p className="channels__footer">
          Catálogo guardado en este navegador.{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              if (window.confirm('¿Quitar el catálogo de canales de este navegador?')) onClear()
            }}
          >
            Quitar catálogo
          </button>
        </p>
      )}
    </div>
  )
}

interface CardProps {
  channel: Channel
  activeContentId: string | null
  onPlay(channel: Channel, variant: ChannelVariant): void
}

function ChannelCard({ channel, activeContentId, onPlay }: CardProps) {
  const best = channel.variants[0]
  const active = channel.variants.some((v) => v.contentId === activeContentId)
  if (!best) return null

  return (
    <li className={`channel-card${active ? ' channel-card--active' : ''}`}>
      <button
        type="button"
        className="channel-card__main"
        onClick={() => onPlay(channel, best)}
        title={`Reproducir ${channel.name} (${best.label})`}
      >
        <ChannelLogo src={channel.logo} name={channel.name} />
        <span className="channel-card__name">{channel.name}</span>
      </button>
      <div className="channel-card__variants" aria-label={`Fuentes de ${channel.name}`}>
        {channel.variants.map((variant) => (
          <button
            key={variant.contentId}
            type="button"
            className="variant-chip"
            aria-pressed={variant.contentId === activeContentId}
            onClick={() => onPlay(channel, variant)}
            title={variant.title}
          >
            {variant.label}
          </button>
        ))}
      </div>
    </li>
  )
}

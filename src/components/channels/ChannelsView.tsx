import { useMemo, useRef, useState, type ChangeEvent, type RefObject } from 'react'
import type { CatalogImportResult, CatalogSource } from '../../hooks/useCatalog'
import { filterCategories } from '../../lib/catalog'
import type { Channel, ChannelCategory, ChannelVariant } from '../../types/catalog'
import { SearchIcon, UploadIcon } from '../icons'
import { Button } from '../ui/Button'
import { ChannelShelf } from './ChannelShelf'
import { ChannelTile } from './ChannelTile'
import './channels.css'

interface Props {
  categories: ChannelCategory[]
  /** Canales vistos recientemente, ya resueltos contra el catálogo actual. */
  recent: Channel[]
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

const shelfId = (index: number) => `categoria-${index + 1}`

export function ChannelsView({
  categories,
  recent,
  source,
  loaded,
  activeContentId,
  searchRef,
  onPlay,
  onImport,
  onClear,
}: Props) {
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const total = useMemo(() => categories.reduce((n, c) => n + c.channels.length, 0), [categories])
  const results = useMemo(
    () =>
      query.trim() ? filterCategories(categories, query, null).flatMap((c) => c.channels) : [],
    [categories, query],
  )

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = onImport(await file.text(), file.name)
    setMessage(
      result.ok
        ? {
            kind: 'ok',
            text: `Catálogo cargado: ${plural(result.channels, 'canal', 'canales')} y ${plural(result.entries, 'fuente', 'fuentes')}${result.invalid ? `; ${plural(result.invalid, 'entrada no válida', 'entradas no válidas')}` : ''}.`,
          }
        : { kind: 'error', text: `${file.name}: ${result.message}` },
    )
  }

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      name="catalog"
      accept=".json,application/json"
      onChange={(event) => void handleFile(event)}
      hidden
    />
  )

  if (!loaded) return null

  if (total === 0) {
    return (
      <section className="catalog-empty" aria-labelledby="catalog-empty-title">
        <h1 className="page-title" id="catalog-empty-title">
          Aún no hay canales
        </h1>
        <p className="catalog-empty__lead">
          Deja tu catálogo en el servidor como <code>data/catalog.json</code> y aparecerá aquí en
          todos tus dispositivos. También puedes cargarlo solo en este navegador.
        </p>
        <Button variant="primary" icon={<UploadIcon />} onClick={() => fileRef.current?.click()}>
          Cargar catálogo
        </Button>
        {message && (
          <p className={`text-${message.kind}`} role="status">
            {message.text}
          </p>
        )}
        <details className="catalog-empty__format">
          <summary>Formato del archivo</summary>
          <pre>{`{ "hashes": [
  { "title": "Canal 1080p *", "hash": "<40 caracteres hex>",
    "group": "Categoría", "logo": "https://…" }
] }`}</pre>
          <p>
            Solo <code>hash</code> es obligatorio. Las variantes de un mismo canal (720p, 1080p,
            marcas <code>*</code>) se agrupan solas en una tarjeta.
          </p>
        </details>
        {fileInput}
      </section>
    )
  }

  return (
    <div className="channels">
      <header className="channels__head">
        <h1 className="page-title">Canales</h1>
        <p className="channels__summary">
          {plural(total, 'canal', 'canales')} en{' '}
          {plural(categories.length, 'categoría', 'categorías')}
        </p>
      </header>

      <div className="channels__toolbar">
        <label className="search">
          <SearchIcon className="search__icon" />
          <span className="visually-hidden">Buscar canales</span>
          <input
            ref={searchRef}
            type="search"
            name="q"
            className="search__input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && query) {
                event.stopPropagation()
                setQuery('')
              }
            }}
            placeholder="Buscar un canal o categoría…"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
          <kbd className="search__kbd" aria-hidden="true">
            /
          </kbd>
        </label>
        {source !== 'server' && (
          <>
            <Button
              variant="ghost"
              icon={<UploadIcon />}
              onClick={() => fileRef.current?.click()}
              title="Sustituir el catálogo por otro archivo JSON"
            >
              Cambiar catálogo
            </Button>
            {fileInput}
          </>
        )}
      </div>

      {message && (
        <p className={`channels__message text-${message.kind}`} role="status">
          {message.text}
        </p>
      )}

      {query.trim() ? (
        <section className="results" aria-label="Resultados de la búsqueda">
          <p className="results__count" role="status">
            {results.length === 0
              ? `Ningún canal coincide con «${query.trim()}». Prueba con otro nombre o categoría.`
              : plural(results.length, 'resultado', 'resultados')}
          </p>
          <ul className="results__grid">
            {results.map((channel) => (
              <ChannelTile
                key={channel.key}
                channel={channel}
                activeContentId={activeContentId}
                onPlay={onPlay}
              />
            ))}
          </ul>
        </section>
      ) : (
        <>
          <nav className="jump" aria-label="Ir a una categoría">
            {categories.map((category, index) => (
              <a key={category.name} className="jump__link" href={`#${shelfId(index)}`}>
                {category.name}
              </a>
            ))}
          </nav>

          {recent.length > 0 && (
            <ChannelShelf
              id="vistos-recientemente"
              title="Vistos recientemente"
              note={plural(recent.length, 'canal', 'canales')}
              channels={recent}
              activeContentId={activeContentId}
              onPlay={onPlay}
            />
          )}

          {categories.map((category, index) => (
            <ChannelShelf
              key={category.name}
              id={shelfId(index)}
              title={category.name}
              note={plural(category.channels.length, 'canal', 'canales')}
              channels={category.channels}
              activeContentId={activeContentId}
              onPlay={onPlay}
            />
          ))}
        </>
      )}

      <footer className="channels__footer">
        {source === 'server' ? (
          <p>
            Catálogo del servidor (<code>data/catalog.json</code>). Para actualizarlo, sustituye el
            archivo y recarga la página.
          </p>
        ) : (
          <p>
            Catálogo guardado en este navegador.{' '}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                if (window.confirm('¿Quitar el catálogo de canales de este navegador?')) onClear()
              }}
            >
              Quitar catálogo
            </button>
          </p>
        )}
      </footer>
    </div>
  )
}

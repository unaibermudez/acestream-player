import { useCallback, useEffect, useMemo, useState } from 'react'
import { groupCatalog, parseCatalog } from '../lib/catalog'
import { createDefaultCatalogStorage, type CatalogStorage } from '../lib/storage'
import type { CatalogEntry, ChannelCategory } from '../types/catalog'

/**
 * Catálogo del servidor: carpeta `data/` montada en el contenedor (en desarrollo, `public/data/`).
 * Si existe, tiene prioridad sobre el importado en el navegador y es el mismo para todos los dispositivos.
 */
export const SERVER_CATALOG_URL = '/data/catalog.json'

export type CatalogSource = 'none' | 'local' | 'server'

export type CatalogImportResult =
  { ok: true; channels: number; entries: number; invalid: number } | { ok: false; message: string }

export interface CatalogApi {
  categories: ChannelCategory[]
  source: CatalogSource
  loaded: boolean
  importText(text: string): CatalogImportResult
  clear(): void
}

async function fetchServerCatalog(): Promise<CatalogEntry[]> {
  try {
    const response = await fetch(SERVER_CATALOG_URL, { cache: 'no-store' })
    // nginx responde 404 si falta; el content-type protege además del fallback de la SPA en dev.
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return []
    return parseCatalog(await response.json())?.entries ?? []
  } catch {
    return []
  }
}

export function useCatalog(storage: CatalogStorage = defaultStorage()): CatalogApi {
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [source, setSource] = useState<CatalogSource>('none')
  const [loaded, setLoaded] = useState(false)

  /** Servidor primero; si no tiene catálogo, el importado en este navegador. */
  const load = useCallback(async () => {
    const remote = await fetchServerCatalog()
    if (remote.length > 0) return { entries: remote, source: 'server' as const }
    const local = await storage.load()
    return { entries: local, source: local.length > 0 ? ('local' as const) : ('none' as const) }
  }, [storage])

  useEffect(() => {
    let cancelled = false
    void load().then((result) => {
      if (cancelled) return
      setEntries(result.entries)
      setSource(result.source)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const importText = useCallback(
    (text: string): CatalogImportResult => {
      let data: unknown
      try {
        data = JSON.parse(text.replace(/^\uFEFF/, ''))
      } catch {
        return { ok: false, message: 'El archivo no es un JSON válido.' }
      }
      const parsed = parseCatalog(data)
      if (!parsed) return { ok: false, message: 'El JSON no contiene una lista de canales.' }
      if (parsed.entries.length === 0) {
        return { ok: false, message: 'El catálogo no tiene ningún content ID válido.' }
      }
      setEntries(parsed.entries)
      setSource('local')
      storage.save(parsed.entries).catch((error: unknown) => {
        console.error('No se pudo guardar el catálogo', error)
      })
      const channels = groupCatalog(parsed.entries).reduce((n, c) => n + c.channels.length, 0)
      return { ok: true, channels, entries: parsed.entries.length, invalid: parsed.invalid }
    },
    [storage],
  )

  const clear = useCallback(() => {
    void storage
      .clear()
      .then(load)
      .then((result) => {
        setEntries(result.entries)
        setSource(result.source)
      })
  }, [storage, load])

  const categories = useMemo(() => groupCatalog(entries), [entries])

  return { categories, source, loaded, importText, clear }
}

let sharedStorage: CatalogStorage | null = null
function defaultStorage(): CatalogStorage {
  sharedStorage ??= createDefaultCatalogStorage()
  return sharedStorage
}

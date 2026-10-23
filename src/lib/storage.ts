import type { CatalogEntry } from '../types/catalog'
import type { StreamLink } from '../types/stream'
import { parseCatalog } from './catalog'
import { parseLinkList } from './schema'

/**
 * Contrato de persistencia. La app solo depende de esta interfaz, así que cambiar
 * localStorage por un backend HTTP consiste en escribir otra implementación.
 */
export interface LinkStorage {
  load(): Promise<StreamLink[]>
  save(links: StreamLink[]): Promise<void>
}

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

export const STORAGE_KEY = 'acestream-player:links:v1'

export function createKeyValueStorage(store: KeyValueStore, key = STORAGE_KEY): LinkStorage {
  return {
    async load() {
      const raw = store.getItem(key)
      if (!raw) return []
      try {
        return parseLinkList(JSON.parse(raw))?.links ?? []
      } catch {
        console.warn('Los datos guardados están corruptos y se ignoran.')
        return []
      }
    },
    async save(links) {
      store.setItem(key, JSON.stringify(links))
    },
  }
}

/** Almacenamiento que usa la app. Para usar otro backend, sustitúyelo aquí. */
export function createDefaultStorage(): LinkStorage {
  return createKeyValueStorage(window.localStorage)
}

/** Persistencia del catálogo de canales importado por el usuario. */
export interface CatalogStorage {
  load(): Promise<CatalogEntry[]>
  save(entries: CatalogEntry[]): Promise<void>
  clear(): Promise<void>
}

export const CATALOG_KEY = 'acestream-player:catalog:v1'

export function createKeyValueCatalogStorage(
  store: KeyValueStore & Pick<Storage, 'removeItem'>,
  key = CATALOG_KEY,
): CatalogStorage {
  return {
    async load() {
      const raw = store.getItem(key)
      if (!raw) return []
      try {
        return parseCatalog(JSON.parse(raw))?.entries ?? []
      } catch {
        console.warn('El catálogo guardado está corrupto y se ignora.')
        return []
      }
    },
    async save(entries) {
      store.setItem(key, JSON.stringify({ entries }))
    },
    async clear() {
      store.removeItem(key)
    },
  }
}

export function createDefaultCatalogStorage(): CatalogStorage {
  return createKeyValueCatalogStorage(window.localStorage)
}

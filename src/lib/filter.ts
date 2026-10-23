import type { StreamLink } from '../types/stream'

export interface LinkFilter {
  query: string
  tag: string | null
  favoritesOnly: boolean
}

export const EMPTY_FILTER: LinkFilter = { query: '', tag: null, favoritesOnly: false }

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/**
 * Filtra por texto (nombre, etiquetas o content ID; sin tener en cuenta tildes ni mayúsculas),
 * etiqueta y favoritos. Ordena favoritos primero, después por uso más reciente y por fecha de alta.
 */
export function filterLinks(links: StreamLink[], filter: LinkFilter): StreamLink[] {
  const terms = normalize(filter.query).split(/\s+/).filter(Boolean)
  const tag = filter.tag?.toLowerCase() ?? null

  return links
    .filter((link) => {
      if (filter.favoritesOnly && !link.favorite) return false
      if (tag && !link.tags.some((t) => t.toLowerCase() === tag)) return false
      if (terms.length === 0) return true
      const haystack = normalize([link.name, link.contentId, ...link.tags].join(' '))
      return terms.every((term) => haystack.includes(term))
    })
    .sort(compareLinks)
}

function compareDesc(a: string, b: string): number {
  return a < b ? 1 : a > b ? -1 : 0
}

function compareLinks(a: StreamLink, b: StreamLink): number {
  if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
  return (
    compareDesc(a.lastPlayedAt ?? '', b.lastPlayedAt ?? '') || compareDesc(a.createdAt, b.createdAt)
  )
}

/** Todas las etiquetas usadas, sin duplicados y en orden alfabético. */
export function collectTags(links: StreamLink[]): string[] {
  const byKey = new Map<string, string>()
  for (const link of links) {
    for (const tag of link.tags) {
      const key = tag.toLowerCase()
      if (!byKey.has(key)) byKey.set(key, tag)
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'es'))
}

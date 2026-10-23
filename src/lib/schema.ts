import type { StreamLink } from '../types/stream'
import { defaultName, isContentId, normalizeTags } from './links'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

/** Valida y normaliza un valor desconocido como StreamLink. Devuelve `null` si no es válido. */
export function toStreamLink(value: unknown): StreamLink | null {
  if (!isRecord(value)) return null
  const { id, name, contentId, tags, favorite, createdAt, lastPlayedAt } = value
  if (typeof id !== 'string' || !id) return null
  if (typeof contentId !== 'string' || !isContentId(contentId)) return null
  if (!isIsoDate(createdAt)) return null
  const normalizedId = contentId.toLowerCase()
  return {
    id,
    name: typeof name === 'string' && name.trim() ? name.trim() : defaultName(normalizedId),
    contentId: normalizedId,
    tags: Array.isArray(tags)
      ? normalizeTags(tags.filter((t): t is string => typeof t === 'string'))
      : [],
    favorite: favorite === true,
    createdAt,
    lastPlayedAt: isIsoDate(lastPlayedAt) ? lastPlayedAt : null,
  }
}

export interface LinkListParseResult {
  links: StreamLink[]
  invalid: number
}

/** Acepta un array de links o un objeto `{ links: [...] }` (el formato de exportación). */
export function parseLinkList(data: unknown): LinkListParseResult | null {
  const items = Array.isArray(data) ? data : isRecord(data) ? data.links : undefined
  if (!Array.isArray(items)) return null
  const links: StreamLink[] = []
  let invalid = 0
  for (const item of items) {
    const link = toStreamLink(item)
    if (link) links.push(link)
    else invalid++
  }
  return { links, invalid }
}

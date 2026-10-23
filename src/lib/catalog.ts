import type { CatalogEntry, Channel, ChannelCategory, ChannelVariant } from '../types/catalog'
import { isContentId } from './links'

const UNCATEGORIZED = 'Sin categoría'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function firstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export interface CatalogParseResult {
  entries: CatalogEntry[]
  invalid: number
}

/**
 * Valida un catálogo con la forma `{ hashes: [{ title, hash, group, logo }] }` o un array de esas
 * entradas. También acepta `contentId`/`id`/`name`/`category` como nombres alternativos.
 * Descarta entradas sin content ID válido y content IDs repetidos.
 */
export function parseCatalog(data: unknown): CatalogParseResult | null {
  const items = Array.isArray(data)
    ? data
    : isRecord(data)
      ? (data.hashes ?? data.channels ?? data.entries)
      : undefined
  if (!Array.isArray(items)) return null

  const seen = new Set<string>()
  const entries: CatalogEntry[] = []
  let invalid = 0
  for (const item of items) {
    if (!isRecord(item)) {
      invalid++
      continue
    }
    const contentId = firstString(item, ['hash', 'contentId', 'content_id', 'id']).toLowerCase()
    if (!isContentId(contentId)) {
      invalid++
      continue
    }
    if (seen.has(contentId)) continue
    seen.add(contentId)
    const logo = firstString(item, ['logo', 'tvg_logo', 'image'])
    entries.push({
      contentId,
      title: firstString(item, ['title', 'name']) || `Canal ${contentId.slice(0, 8)}`,
      group: firstString(item, ['group', 'category', 'group_title']) || UNCATEGORIZED,
      logo: /^https?:\/\//i.test(logo) ? logo : null,
    })
  }
  return { entries, invalid }
}

const TITLE_RE = /^(.*?)\s*(?:\b(\d{3,4}p|4K|UHD|FHD|HD|SD)\b)?\s*(\*+)?\s*$/i

export interface ParsedTitle {
  /** Nombre del canal sin calidad ni marcas. */
  base: string
  quality: string | null
  /** Marcas de origen del final del título (`*`, `**`). */
  marker: string | null
}

/** "Canal 2 1080p **" → { base: "Canal 2", quality: "1080p", marker: "**" } */
export function parseTitle(title: string): ParsedTitle {
  const match = TITLE_RE.exec(title.trim())
  const base = match?.[1]?.trim() || title.trim()
  const quality = match?.[2] ?? null
  return {
    base,
    // "1080P" → "1080p"; "4k"/"uhd" → "4K"/"UHD"
    quality: quality
      ? /^\d+p$/i.test(quality)
        ? quality.toLowerCase()
        : quality.toUpperCase()
      : null,
    marker: match?.[3] ?? null,
  }
}

function channelKey(category: string, base: string): string {
  const normalized = base.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ')
  return `${category.toLowerCase()}::${normalized}`
}

function qualityRank(quality: string | null): number {
  if (!quality) return 0
  if (/^(4K|UHD|2160p)$/i.test(quality)) return 5
  if (/^(1080p|FHD)$/i.test(quality)) return 4
  if (/^(720p|HD)$/i.test(quality)) return 3
  const lines = Number.parseInt(quality, 10)
  return Number.isNaN(lines) ? 1 : lines >= 1080 ? 4 : lines >= 720 ? 3 : 2
}

/** Etiquetas únicas: si dos variantes coinciden ("1080p **" dos veces) se numeran. */
function labelVariants(variants: Omit<ChannelVariant, 'label'>[], markers: (string | null)[]) {
  // Sin calidad conocida se muestra "Fuente" para que el botón no quede como un "*" suelto.
  const base = variants.map((v, i) => [v.quality ?? 'Fuente', markers[i]].filter(Boolean).join(' '))
  const totals = new Map<string, number>()
  for (const label of base) totals.set(label, (totals.get(label) ?? 0) + 1)
  const counters = new Map<string, number>()
  return variants.map((variant, i) => {
    const label = base[i] ?? 'Fuente'
    if ((totals.get(label) ?? 0) < 2) return { ...variant, label }
    const n = (counters.get(label) ?? 0) + 1
    counters.set(label, n)
    return { ...variant, label: `${label} (${n})` }
  })
}

/**
 * Agrupa el catálogo en categorías (en el orden en que aparecen) y, dentro de cada una, junta
 * en un mismo canal las variantes que solo difieren en calidad o marcas de origen.
 */
export function groupCatalog(entries: CatalogEntry[]): ChannelCategory[] {
  interface Draft {
    channel: Omit<Channel, 'variants'>
    items: { variant: Omit<ChannelVariant, 'label'>; marker: string | null; order: number }[]
  }
  const categories = new Map<string, Map<string, Draft>>()

  entries.forEach((entry, order) => {
    const { base, quality, marker } = parseTitle(entry.title)
    const key = channelKey(entry.group, base)
    let channels = categories.get(entry.group)
    if (!channels) {
      channels = new Map()
      categories.set(entry.group, channels)
    }
    let draft = channels.get(key)
    if (!draft) {
      draft = { channel: { key, name: base, category: entry.group, logo: null }, items: [] }
      channels.set(key, draft)
    }
    draft.channel.logo ??= entry.logo
    draft.items.push({
      variant: { contentId: entry.contentId, quality, title: entry.title },
      marker,
      order,
    })
  })

  return [...categories].map(([name, channels]) => ({
    name,
    channels: [...channels.values()].map(({ channel, items }) => {
      const sorted = [...items].sort(
        (a, b) =>
          qualityRank(b.variant.quality) - qualityRank(a.variant.quality) || a.order - b.order,
      )
      return {
        ...channel,
        variants: labelVariants(
          sorted.map((item) => item.variant),
          sorted.map((item) => item.marker),
        ),
      }
    }),
  }))
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Filtra por texto (nombre del canal o categoría) y por categoría, quitando las vacías. */
export function filterCategories(
  categories: ChannelCategory[],
  query: string,
  category: string | null,
): ChannelCategory[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  return categories
    .filter((c) => !category || c.name === category)
    .map((c) => ({
      ...c,
      channels: c.channels.filter((channel) => {
        if (terms.length === 0) return true
        const haystack = normalize(`${channel.name} ${c.name}`)
        return terms.every((term) => haystack.includes(term))
      }),
    }))
    .filter((c) => c.channels.length > 0)
}

import type { ParsedEntry, ParseResult, StreamLink } from '../types/stream'

const CONTENT_ID_RE = /^[0-9a-f]{40}$/i
const ACESTREAM_URI_RE = /^acestream:\/\/([0-9a-f]{40})\/?$/i
/** URLs del propio motor (`/ace/getstream?id=…`, `/ace/manifest.m3u8?id=…`), habituales en listas M3U. */
const ENGINE_URL_RE =
  /^https?:\/\/\S+\/ace\/(?:getstream|manifest\.m3u8)\?(?:\S*&)?(?:id|content_id)=([0-9a-f]{40})(?:[&#]\S*)?$/i

export function isContentId(value: string): boolean {
  return CONTENT_ID_RE.test(value)
}

/**
 * Extrae el content ID de `acestream://ID`, de un ID suelto o de una URL del motor.
 * Devuelve el ID en minúsculas, o `null` si el texto no es un link válido.
 */
export function extractContentId(input: string): string | null {
  const value = input.trim()
  if (CONTENT_ID_RE.test(value)) return value.toLowerCase()
  const match = ACESTREAM_URI_RE.exec(value) ?? ENGINE_URL_RE.exec(value)
  return match?.[1]?.toLowerCase() ?? null
}

function describeInvalid(link: string): string {
  if (/^acestream:\/\//i.test(link)) {
    return 'El ID tras acestream:// debe tener 40 caracteres hexadecimales'
  }
  if (/^[0-9a-f]+$/i.test(link)) {
    return `El ID tiene ${link.length} caracteres; se esperaban 40`
  }
  return 'No es un link acestream:// ni un ID de 40 caracteres hexadecimales'
}

/**
 * Parsea texto pegado por el usuario: un link por línea, opcionalmente `Nombre | link`.
 * Ignora líneas vacías y comentarios que empiezan por `#`.
 */
export function parseBulkInput(text: string): ParseResult {
  const result: ParseResult = { entries: [], errors: [] }
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim()
    if (!line || line.startsWith('#')) return

    const separator = line.lastIndexOf('|')
    const name = separator >= 0 ? line.slice(0, separator).trim() : ''
    const link = separator >= 0 ? line.slice(separator + 1).trim() : line

    const contentId = extractContentId(link)
    if (!contentId) {
      result.errors.push({ line: index + 1, text: line, reason: describeInvalid(link) })
      return
    }
    result.entries.push({ contentId, name: name || null, tags: [] })
  })
  return result
}

export interface AdditionPlan {
  toAdd: ParsedEntry[]
  /** Entradas descartadas porque el content ID ya existía o venía repetido en la misma entrada. */
  duplicates: ParsedEntry[]
}

export function planAdditions(entries: ParsedEntry[], existing: StreamLink[]): AdditionPlan {
  const seen = new Set(existing.map((link) => link.contentId))
  const plan: AdditionPlan = { toAdd: [], duplicates: [] }
  for (const entry of entries) {
    if (seen.has(entry.contentId)) {
      plan.duplicates.push(entry)
    } else {
      seen.add(entry.contentId)
      plan.toAdd.push(entry)
    }
  }
  return plan
}

export function defaultName(contentId: string): string {
  return `Stream ${contentId.slice(0, 8)}`
}

export function createLink(entry: ParsedEntry, id: string, now: Date): StreamLink {
  return {
    id,
    name: entry.name ?? defaultName(entry.contentId),
    contentId: entry.contentId,
    tags: normalizeTags(entry.tags),
    favorite: false,
    createdAt: now.toISOString(),
    lastPlayedAt: null,
  }
}

/** Limpia espacios, quita duplicados sin distinguir mayúsculas y conserva el orden. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const tag of tags) {
    const clean = tag.trim().replace(/\s+/g, ' ')
    const key = clean.toLowerCase()
    if (clean && !seen.has(key)) {
      seen.add(key)
      out.push(clean)
    }
  }
  return out
}

/** Convierte "deportes, cine ,  " en ["deportes", "cine"]. */
export function parseTagsInput(value: string): string[] {
  return normalizeTags(value.split(','))
}

export function toAcestreamUri(contentId: string): string {
  return `acestream://${contentId}`
}

/** URL HLS relativa: nginx (o el proxy de Vite en desarrollo) la envía al motor desde el mismo origen. */
export function hlsUrl(contentId: string): string {
  return `/ace/manifest.m3u8?id=${contentId}`
}

/** URL MPEG-TS absoluta, pensada para pegarla en VLC o mpv. */
export function getstreamUrl(contentId: string, origin: string): string {
  return `${origin}/ace/getstream?id=${contentId}`
}

import type { ParseResult, StreamLink } from '../types/stream'
import { parseBulkInput } from './links'
import { looksLikeM3u, parseM3u } from './m3u'
import { parseLinkList } from './schema'

export const EXPORT_VERSION = 1

export interface ExportFile {
  app: 'acestream-player'
  version: number
  exportedAt: string
  links: StreamLink[]
}

export function buildExport(links: StreamLink[], now: Date): ExportFile {
  return { app: 'acestream-player', version: EXPORT_VERSION, exportedAt: now.toISOString(), links }
}

export function exportFileName(now: Date): string {
  return `acestream-links-${now.toISOString().slice(0, 10)}.json`
}

export type ImportPayload =
  | { kind: 'json'; links: StreamLink[]; invalid: number }
  | { kind: 'entries'; format: 'm3u' | 'text'; result: ParseResult }
  | { kind: 'error'; message: string }

/**
 * Detecta el formato por contenido (no por extensión) y lo parsea:
 * JSON exportado por la app, lista M3U o texto con un link por línea.
 */
export function parseImport(text: string): ImportPayload {
  const trimmed = text.replace(/^\uFEFF/, '').trim()
  if (!trimmed) return { kind: 'error', message: 'El archivo está vacío.' }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let data: unknown
    try {
      data = JSON.parse(trimmed)
    } catch {
      return { kind: 'error', message: 'El archivo parece JSON pero no es válido.' }
    }
    const parsed = parseLinkList(data)
    if (!parsed) return { kind: 'error', message: 'El JSON no contiene una lista de links.' }
    return { kind: 'json', ...parsed }
  }

  if (looksLikeM3u(trimmed)) return { kind: 'entries', format: 'm3u', result: parseM3u(trimmed) }
  return { kind: 'entries', format: 'text', result: parseBulkInput(trimmed) }
}

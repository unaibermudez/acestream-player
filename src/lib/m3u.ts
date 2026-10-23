import type { ParseResult } from '../types/stream'
import { extractContentId, normalizeTags } from './links'

interface ExtInf {
  title: string
  attributes: Record<string, string>
}

/**
 * Parsea `#EXTINF:-1 tvg-id="x" group-title="Grupo",Título`. La coma que separa el título es
 * la primera que queda fuera de comillas, porque los atributos pueden contener comas.
 */
export function parseExtInf(line: string): ExtInf {
  const body = line.slice(line.indexOf(':') + 1)
  let inQuotes = false
  let commaIndex = -1
  for (let i = 0; i < body.length; i++) {
    const char = body[i]
    if (char === '"') inQuotes = !inQuotes
    else if (char === ',' && !inQuotes) {
      commaIndex = i
      break
    }
  }
  const head = commaIndex >= 0 ? body.slice(0, commaIndex) : body
  const title = commaIndex >= 0 ? body.slice(commaIndex + 1).trim() : ''
  const attributes: Record<string, string> = {}
  for (const match of head.matchAll(/([\w-]+)="([^"]*)"/g)) {
    const [, key, value] = match
    if (key && value !== undefined) attributes[key.toLowerCase()] = value.trim()
  }
  return { title, attributes }
}

/**
 * Extrae los links de Acestream de una lista M3U/M3U8. Usa el título de `#EXTINF` como nombre
 * y `group-title` / `#EXTGRP` como etiqueta. Las URLs que no son de Acestream se informan como
 * error y no se importan.
 */
export function parseM3u(text: string): ParseResult {
  const result: ParseResult = { entries: [], errors: [] }
  let pending: { title: string; group: string | null } | null = null

  text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const line = raw.trim()
      if (!line) return

      if (line.startsWith('#')) {
        const upper = line.toUpperCase()
        if (upper.startsWith('#EXTINF')) {
          const { title, attributes } = parseExtInf(line)
          pending = { title, group: attributes['group-title'] || null }
        } else if (upper.startsWith('#EXTGRP:') && pending) {
          pending.group ??= line.slice('#EXTGRP:'.length).trim() || null
        }
        return
      }

      const meta: { title: string; group: string | null } | null = pending
      pending = null
      const contentId = extractContentId(line)
      if (!contentId) {
        result.errors.push({
          line: index + 1,
          text: line,
          reason: 'No es un link de Acestream (acestream://, ID o URL /ace/ del motor)',
        })
        return
      }
      result.entries.push({
        contentId,
        name: meta?.title || null,
        tags: normalizeTags(meta?.group ? [meta.group] : []),
      })
    })

  return result
}

export function looksLikeM3u(text: string): boolean {
  return /^\uFEFF?\s*#EXTM3U/i.test(text) || /^#EXTINF/im.test(text)
}

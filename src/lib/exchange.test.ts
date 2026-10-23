import { describe, expect, it } from 'vitest'
import type { StreamLink } from '../types/stream'
import { buildExport, exportFileName, parseImport } from './exchange'

const sample: StreamLink = {
  id: 'id-1',
  name: 'Prueba',
  contentId: '9'.repeat(40),
  tags: [],
  favorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastPlayedAt: null,
}

const now = new Date('2026-03-04T05:06:07.000Z')

describe('exportación', () => {
  it('incluye metadatos y los links', () => {
    expect(buildExport([sample], now)).toEqual({
      app: 'acestream-player',
      version: 1,
      exportedAt: '2026-03-04T05:06:07.000Z',
      links: [sample],
    })
    expect(exportFileName(now)).toBe('acestream-links-2026-03-04.json')
  })

  it('lo exportado se puede volver a importar', () => {
    const text = JSON.stringify(buildExport([sample], now))
    expect(parseImport(text)).toEqual({ kind: 'json', links: [sample], invalid: 0 })
  })
})

describe('parseImport', () => {
  it('detecta M3U', () => {
    const payload = parseImport(`#EXTM3U\n#EXTINF:-1,Uno\nacestream://${'8'.repeat(40)}`)
    expect(payload.kind === 'entries' && payload.format).toBe('m3u')
  })

  it('usa texto plano como último recurso', () => {
    const payload = parseImport(`Uno | ${'7'.repeat(40)}`)
    expect(payload.kind === 'entries' && payload.format).toBe('text')
  })

  it('informa de JSON roto, sin lista o archivo vacío', () => {
    expect(parseImport('{roto').kind).toBe('error')
    expect(parseImport('{"a": 1}')).toEqual({
      kind: 'error',
      message: 'El JSON no contiene una lista de links.',
    })
    expect(parseImport('   ').kind).toBe('error')
  })
})

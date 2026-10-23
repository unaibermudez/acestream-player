import { describe, expect, it } from 'vitest'
import type { StreamLink } from '../types/stream'
import {
  createLink,
  extractContentId,
  getstreamUrl,
  hlsUrl,
  normalizeTags,
  parseBulkInput,
  parseTagsInput,
  planAdditions,
  toAcestreamUri,
} from './links'

// IDs de relleno claramente falsos: un mismo carácter repetido 40 veces.
const ID_A = 'a'.repeat(40)
const ID_B = 'b'.repeat(40)
const ID_C = 'c'.repeat(40)

function link(contentId: string): StreamLink {
  return createLink({ contentId, name: null, tags: [] }, contentId, new Date(0))
}

describe('extractContentId', () => {
  it('acepta un ID suelto y lo pasa a minúsculas', () => {
    expect(extractContentId(ID_A)).toBe(ID_A)
    expect(extractContentId('F'.repeat(40))).toBe('f'.repeat(40))
  })

  it('acepta acestream://ID con espacios y barra final', () => {
    expect(extractContentId(`  acestream://${ID_B}  `)).toBe(ID_B)
    expect(extractContentId(`ACESTREAM://${ID_B}/`)).toBe(ID_B)
  })

  it('acepta URLs del motor (getstream y manifest)', () => {
    expect(extractContentId(`http://host:6878/ace/getstream?id=${ID_C}`)).toBe(ID_C)
    expect(extractContentId(`https://x.lan/ace/manifest.m3u8?id=${ID_C}&pid=1`)).toBe(ID_C)
    expect(extractContentId(`http://h/ace/getstream?pid=2&content_id=${ID_C}`)).toBe(ID_C)
  })

  it('rechaza longitudes y caracteres incorrectos', () => {
    expect(extractContentId('a'.repeat(39))).toBeNull()
    expect(extractContentId('a'.repeat(41))).toBeNull()
    expect(extractContentId('g'.repeat(40))).toBeNull()
    expect(extractContentId(`acestream://${'a'.repeat(39)}`)).toBeNull()
    expect(extractContentId(`acestream://${ID_A}extra`)).toBeNull()
    expect(extractContentId('')).toBeNull()
    expect(extractContentId('http://example.invalid/video.mp4')).toBeNull()
  })
})

describe('parseBulkInput', () => {
  it('parsea varias líneas con y sin nombre', () => {
    const result = parseBulkInput(
      [`acestream://${ID_A}`, '', `Canal de prueba | ${ID_B}`, `  # comentario`].join('\n'),
    )
    expect(result.errors).toEqual([])
    expect(result.entries).toEqual([
      { contentId: ID_A, name: null, tags: [] },
      { contentId: ID_B, name: 'Canal de prueba', tags: [] },
    ])
  })

  it('admite "|" dentro del nombre usando el último separador', () => {
    const { entries } = parseBulkInput(`A | B | acestream://${ID_C}`)
    expect(entries[0]).toEqual({ contentId: ID_C, name: 'A | B', tags: [] })
  })

  it('trata un nombre vacío como ausente', () => {
    const { entries } = parseBulkInput(` | ${ID_A}`)
    expect(entries[0]?.name).toBeNull()
  })

  it('informa de errores con número de línea y motivo', () => {
    const result = parseBulkInput(`${ID_A}\r\nhola\r\nacestream://123\r\nabc123`)
    expect(result.entries).toHaveLength(1)
    expect(result.errors.map((e) => e.line)).toEqual([2, 3, 4])
    expect(result.errors[1]?.reason).toMatch(/acestream:\/\//)
    expect(result.errors[2]?.reason).toMatch(/6 caracteres/)
  })
})

describe('planAdditions', () => {
  it('detecta duplicados contra la lista y dentro de la entrada', () => {
    const entries = [ID_A, ID_B, ID_B, ID_C].map((contentId) => ({
      contentId,
      name: null,
      tags: [],
    }))
    const plan = planAdditions(entries, [link(ID_A)])
    expect(plan.toAdd.map((e) => e.contentId)).toEqual([ID_B, ID_C])
    expect(plan.duplicates.map((e) => e.contentId)).toEqual([ID_A, ID_B])
  })
})

describe('createLink', () => {
  it('rellena valores por defecto', () => {
    const now = new Date('2026-01-02T03:04:05.000Z')
    expect(createLink({ contentId: ID_A, name: null, tags: [' x ', 'X'] }, 'id-1', now)).toEqual({
      id: 'id-1',
      name: 'Stream aaaaaaaa',
      contentId: ID_A,
      tags: ['x'],
      favorite: false,
      createdAt: '2026-01-02T03:04:05.000Z',
      lastPlayedAt: null,
    })
  })
})

describe('etiquetas', () => {
  it('normaliza espacios y duplicados sin distinguir mayúsculas', () => {
    expect(normalizeTags(['  Cine ', 'cine', 'Series  TV', ''])).toEqual(['Cine', 'Series TV'])
  })

  it('parsea la entrada separada por comas', () => {
    expect(parseTagsInput('deportes, cine ,  ,Deportes')).toEqual(['deportes', 'cine'])
  })
})

describe('URLs', () => {
  it('construye las URLs del motor y el URI acestream', () => {
    expect(hlsUrl(ID_A)).toBe(`/ace/manifest.m3u8?id=${ID_A}`)
    expect(getstreamUrl(ID_A, 'http://192.0.2.1:8080')).toBe(
      `http://192.0.2.1:8080/ace/getstream?id=${ID_A}`,
    )
    expect(toAcestreamUri(ID_A)).toBe(`acestream://${ID_A}`)
  })
})

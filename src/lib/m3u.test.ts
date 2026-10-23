import { describe, expect, it } from 'vitest'
import { looksLikeM3u, parseExtInf, parseM3u } from './m3u'

// IDs de relleno claramente falsos.
const ID_1 = '1'.repeat(40)
const ID_2 = '2'.repeat(40)
const ID_3 = '3'.repeat(40)

describe('parseExtInf', () => {
  it('separa atributos y título respetando comas entre comillas', () => {
    expect(parseExtInf('#EXTINF:-1 tvg-id="a,b" group-title="Grupo X",Título, con coma')).toEqual({
      title: 'Título, con coma',
      attributes: { 'tvg-id': 'a,b', 'group-title': 'Grupo X' },
    })
  })

  it('tolera EXTINF sin título', () => {
    expect(parseExtInf('#EXTINF:-1').title).toBe('')
  })
})

describe('parseM3u', () => {
  it('importa acestream://, IDs y URLs del motor con nombre y grupo', () => {
    const text = [
      '\uFEFF#EXTM3U',
      '#EXTINF:-1 group-title="Grupo A",Prueba uno',
      `acestream://${ID_1}`,
      '#EXTINF:-1,Prueba dos',
      '#EXTGRP:Grupo B',
      `http://192.0.2.10:6878/ace/getstream?id=${ID_2}`,
      ID_3,
    ].join('\r\n')

    expect(parseM3u(text)).toEqual({
      errors: [],
      entries: [
        { contentId: ID_1, name: 'Prueba uno', tags: ['Grupo A'] },
        { contentId: ID_2, name: 'Prueba dos', tags: ['Grupo B'] },
        { contentId: ID_3, name: null, tags: [] },
      ],
    })
  })

  it('da prioridad a group-title sobre #EXTGRP', () => {
    const text = ['#EXTINF:-1 group-title="A",X', '#EXTGRP:B', ID_1].join('\n')
    expect(parseM3u(text).entries[0]?.tags).toEqual(['A'])
  })

  it('informa de URLs que no son de Acestream con su línea', () => {
    const text = ['#EXTM3U', '#EXTINF:-1,Otro', 'http://example.invalid/live.m3u8', ID_1].join('\n')
    const result = parseM3u(text)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.name).toBeNull()
    expect(result.errors).toEqual([
      expect.objectContaining({ line: 3, text: 'http://example.invalid/live.m3u8' }),
    ])
  })
})

describe('looksLikeM3u', () => {
  it('reconoce cabeceras M3U', () => {
    expect(looksLikeM3u('#EXTM3U\n')).toBe(true)
    expect(looksLikeM3u('\uFEFF  #extm3u')).toBe(true)
    expect(looksLikeM3u(`#EXTINF:-1,X\n${ID_1}`)).toBe(true)
    expect(looksLikeM3u(ID_1)).toBe(false)
    expect(looksLikeM3u('{"links": []}')).toBe(false)
  })
})

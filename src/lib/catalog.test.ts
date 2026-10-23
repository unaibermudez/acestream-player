import { describe, expect, it } from 'vitest'
import { filterCategories, groupCatalog, parseCatalog, parseTitle } from './catalog'

// IDs de relleno claramente falsos y nombres inventados.
const id = (char: string) => char.repeat(40)

describe('parseTitle', () => {
  it('separa nombre, calidad y marcas', () => {
    expect(parseTitle('Canal Prueba 2 1080p **')).toEqual({
      base: 'Canal Prueba 2',
      quality: '1080p',
      marker: '**',
    })
    expect(parseTitle('Canal Prueba 4K *')).toEqual({
      base: 'Canal Prueba',
      quality: '4K',
      marker: '*',
    })
    expect(parseTitle('Canal Prueba 3 **')).toEqual({
      base: 'Canal Prueba 3',
      quality: null,
      marker: '**',
    })
    expect(parseTitle('Canal Prueba')).toEqual({
      base: 'Canal Prueba',
      quality: null,
      marker: null,
    })
  })

  it('no confunde un número del nombre con la calidad', () => {
    expect(parseTitle('Prueba 10 *').base).toBe('Prueba 10')
  })
})

describe('parseCatalog', () => {
  it('lee el formato { hashes } y descarta inválidos y repetidos', () => {
    const result = parseCatalog({
      generated: '2026-01-01T00:00:00Z',
      hashes: [
        { title: 'Uno 720p *', hash: id('A'), group: 'G1', logo: 'https://example.invalid/1.png' },
        { title: 'Uno 1080p *', hash: id('b'), group: 'G1', logo: '' },
        { title: 'Repetido', hash: id('a'), group: 'G1' },
        { title: 'Malo', hash: 'corto', group: 'G1' },
        'basura',
      ],
    })
    expect(result?.invalid).toBe(2)
    expect(result?.entries).toEqual([
      {
        title: 'Uno 720p *',
        contentId: id('a'),
        group: 'G1',
        logo: 'https://example.invalid/1.png',
      },
      { title: 'Uno 1080p *', contentId: id('b'), group: 'G1', logo: null },
    ])
  })

  it('acepta un array con nombres de campo alternativos y rellena valores', () => {
    expect(parseCatalog([{ contentId: id('c'), name: 'X', logo: 'javascript:alert(1)' }])).toEqual({
      entries: [{ title: 'X', contentId: id('c'), group: 'Sin categoría', logo: null }],
      invalid: 0,
    })
  })

  it('devuelve null si no hay lista', () => {
    expect(parseCatalog({ foo: [] })).toBeNull()
    expect(parseCatalog('x')).toBeNull()
  })
})

describe('groupCatalog', () => {
  const entries = [
    { title: 'Canal Uno 720p *', contentId: id('1'), group: 'G1', logo: null },
    {
      title: 'Canal UNO 1080p **',
      contentId: id('2'),
      group: 'G1',
      logo: 'https://e.invalid/u.png',
    },
    { title: 'Canal Uno 1080p **', contentId: id('3'), group: 'G1', logo: null },
    { title: 'Canal Uno 2 *', contentId: id('4'), group: 'G1', logo: null },
    { title: 'Otro 1080p *', contentId: id('5'), group: 'G2', logo: null },
    { title: 'Canal Uno 4K *', contentId: id('6'), group: 'G1', logo: null },
  ]

  it('agrupa por categoría en orden de aparición y junta variantes del mismo canal', () => {
    const categories = groupCatalog(entries)
    expect(categories.map((c) => c.name)).toEqual(['G1', 'G2'])
    expect(categories[0]?.channels.map((c) => c.name)).toEqual(['Canal Uno', 'Canal Uno 2'])
  })

  it('ordena variantes por calidad, numera etiquetas repetidas y toma el primer logo', () => {
    const channel = groupCatalog(entries)[0]?.channels[0]
    expect(channel?.logo).toBe('https://e.invalid/u.png')
    expect(channel?.variants.map((v) => [v.label, v.contentId])).toEqual([
      ['4K *', id('6')],
      ['1080p ** (1)', id('2')],
      ['1080p ** (2)', id('3')],
      ['720p *', id('1')],
    ])
  })

  it('no mezcla canales con el mismo nombre en categorías distintas', () => {
    const categories = groupCatalog([
      { title: 'X 720p', contentId: id('7'), group: 'A', logo: null },
      { title: 'X 1080p', contentId: id('8'), group: 'B', logo: null },
    ])
    expect(categories.map((c) => c.channels.length)).toEqual([1, 1])
  })
})

describe('filterCategories', () => {
  const categories = groupCatalog([
    { title: 'Fútbol Prueba', contentId: id('1'), group: 'DEPORTE', logo: null },
    { title: 'Noticias Prueba', contentId: id('2'), group: 'INFO', logo: null },
  ])

  it('busca sin tildes en nombre y categoría y quita categorías vacías', () => {
    expect(filterCategories(categories, 'futbol', null).map((c) => c.name)).toEqual(['DEPORTE'])
    expect(filterCategories(categories, 'info', null).map((c) => c.name)).toEqual(['INFO'])
  })

  it('filtra por categoría', () => {
    expect(filterCategories(categories, '', 'INFO').map((c) => c.name)).toEqual(['INFO'])
  })
})

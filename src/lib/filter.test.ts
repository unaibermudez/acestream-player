import { describe, expect, it } from 'vitest'
import type { StreamLink } from '../types/stream'
import { collectTags, EMPTY_FILTER, filterLinks } from './filter'

function make(partial: Partial<StreamLink> & Pick<StreamLink, 'id'>): StreamLink {
  return {
    name: partial.id,
    contentId: '0'.repeat(40),
    tags: [],
    favorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastPlayedAt: null,
    ...partial,
  }
}

const links = [
  make({ id: 'uno', name: 'Película Uno', tags: ['Cine'] }),
  make({ id: 'dos', name: 'Partido', tags: ['Deportes'], favorite: true }),
  make({
    id: 'tres',
    name: 'Otro partido',
    tags: ['deportes', 'HD'],
    lastPlayedAt: '2026-02-01T00:00:00.000Z',
  }),
  make({ id: 'cuatro', name: 'Reciente', createdAt: '2026-03-01T00:00:00.000Z' }),
]

const ids = (list: StreamLink[]) => list.map((l) => l.id)

describe('filterLinks', () => {
  it('ordena favoritos, luego último uso y luego fecha de alta', () => {
    expect(ids(filterLinks(links, EMPTY_FILTER))).toEqual(['dos', 'tres', 'cuatro', 'uno'])
  })

  it('busca sin tildes ni mayúsculas y exige todos los términos', () => {
    expect(ids(filterLinks(links, { ...EMPTY_FILTER, query: 'pelicula' }))).toEqual(['uno'])
    expect(ids(filterLinks(links, { ...EMPTY_FILTER, query: 'PARTIDO hd' }))).toEqual(['tres'])
  })

  it('busca también en etiquetas', () => {
    expect(ids(filterLinks(links, { ...EMPTY_FILTER, query: 'cine' }))).toEqual(['uno'])
  })

  it('filtra por etiqueta sin distinguir mayúsculas', () => {
    expect(ids(filterLinks(links, { ...EMPTY_FILTER, tag: 'DEPORTES' }))).toEqual(['dos', 'tres'])
  })

  it('filtra por favoritos', () => {
    expect(ids(filterLinks(links, { ...EMPTY_FILTER, favoritesOnly: true }))).toEqual(['dos'])
  })

  it('no modifica el array original', () => {
    const copy = [...links]
    filterLinks(links, EMPTY_FILTER)
    expect(links).toEqual(copy)
  })
})

describe('collectTags', () => {
  it('devuelve etiquetas únicas ordenadas', () => {
    expect(collectTags(links)).toEqual(['Cine', 'Deportes', 'HD'])
  })
})

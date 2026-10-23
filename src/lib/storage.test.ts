import { describe, expect, it } from 'vitest'
import type { StreamLink } from '../types/stream'
import { parseLinkList, toStreamLink } from './schema'
import { createKeyValueCatalogStorage, createKeyValueStorage } from './storage'

function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

const sample: StreamLink = {
  id: 'x1',
  name: 'Prueba',
  contentId: 'd'.repeat(40),
  tags: ['etiqueta'],
  favorite: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastPlayedAt: null,
}

describe('createKeyValueStorage', () => {
  it('devuelve una lista vacía si no hay datos', async () => {
    await expect(createKeyValueStorage(memoryStore()).load()).resolves.toEqual([])
  })

  it('guarda y recupera la lista', async () => {
    const storage = createKeyValueStorage(memoryStore())
    await storage.save([sample])
    await expect(storage.load()).resolves.toEqual([sample])
  })

  it('ignora JSON corrupto sin lanzar', async () => {
    const storage = createKeyValueStorage(memoryStore({ k: '{no es json' }), 'k')
    await expect(storage.load()).resolves.toEqual([])
  })
})

describe('toStreamLink', () => {
  it('rechaza objetos sin campos obligatorios válidos', () => {
    expect(toStreamLink(null)).toBeNull()
    expect(toStreamLink({ ...sample, contentId: 'corto' })).toBeNull()
    expect(toStreamLink({ ...sample, id: '' })).toBeNull()
    expect(toStreamLink({ ...sample, createdAt: 'ayer' })).toBeNull()
  })

  it('normaliza campos opcionales', () => {
    expect(
      toStreamLink({
        id: 'x2',
        contentId: 'E'.repeat(40),
        createdAt: sample.createdAt,
        tags: ['a', 3, 'A'],
        favorite: 'sí',
        lastPlayedAt: 'nunca',
      }),
    ).toEqual({
      id: 'x2',
      name: 'Stream eeeeeeee',
      contentId: 'e'.repeat(40),
      tags: ['a'],
      favorite: false,
      createdAt: sample.createdAt,
      lastPlayedAt: null,
    })
  })
})

describe('parseLinkList', () => {
  it('acepta un array o el formato de exportación y cuenta inválidos', () => {
    expect(parseLinkList([sample, { basura: true }])).toEqual({ links: [sample], invalid: 1 })
    expect(parseLinkList({ version: 1, links: [sample] })).toEqual({ links: [sample], invalid: 0 })
  })

  it('devuelve null si no hay lista', () => {
    expect(parseLinkList({ foo: 1 })).toBeNull()
    expect(parseLinkList('texto')).toBeNull()
  })
})

describe('createKeyValueCatalogStorage', () => {
  it('guarda, recupera y borra el catálogo', async () => {
    const storage = createKeyValueCatalogStorage(memoryStore())
    const entries = [{ title: 'Prueba', contentId: 'c'.repeat(40), group: 'G', logo: null }]
    await storage.save(entries)
    await expect(storage.load()).resolves.toEqual(entries)
    await storage.clear()
    await expect(storage.load()).resolves.toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { MAX_FAVORITES, parseFavorites, toggleFavorite } from './favorites'

describe('toggleFavorite', () => {
  it('añade al principio y quita si ya estaba', () => {
    expect(toggleFavorite(['a'], 'b')).toEqual(['b', 'a'])
    expect(toggleFavorite(['b', 'a'], 'b')).toEqual(['a'])
  })

  it('no supera el máximo', () => {
    const full = Array.from({ length: MAX_FAVORITES }, (_, i) => `k${i}`)
    expect(toggleFavorite(full, 'nuevo')).toHaveLength(MAX_FAVORITES)
  })
})

describe('parseFavorites', () => {
  it('descarta valores no válidos y repetidos', () => {
    expect(parseFavorites(['a', 1, '', 'a', null, 'b'])).toEqual(['a', 'b'])
    expect(parseFavorites({})).toEqual([])
  })
})

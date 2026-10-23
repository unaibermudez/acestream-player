import { describe, expect, it } from 'vitest'
import { MAX_RECENT, parseRecent, pushRecent } from './recent'
import { nextTheme, parseThemePreference, resolveTheme } from './theme'
import { parseUrlState, serializeUrlState } from './urlState'

const ID = 'a'.repeat(40) // ID de relleno claramente falso

describe('pushRecent', () => {
  const entry = (channelKey: string, playedAt: string) => ({ channelKey, contentId: ID, playedAt })

  it('pone el último primero y quita el duplicado del mismo canal', () => {
    const list = [entry('a', '1'), entry('b', '2')]
    expect(pushRecent(list, entry('b', '3')).map((e) => e.channelKey)).toEqual(['b', 'a'])
  })

  it('recorta al máximo', () => {
    const list = Array.from({ length: MAX_RECENT }, (_, i) => entry(`k${i}`, `${i}`))
    const next = pushRecent(list, entry('nuevo', 'x'))
    expect(next).toHaveLength(MAX_RECENT)
    expect(next[0]?.channelKey).toBe('nuevo')
  })

  it('valida lo leído del almacenamiento', () => {
    expect(parseRecent([entry('a', '1'), { channelKey: 1 }, null])).toEqual([entry('a', '1')])
    expect(parseRecent('x')).toEqual([])
  })
})

describe('urlState', () => {
  it('lee vista y stream de la query', () => {
    expect(parseUrlState(`?vista=links&ver=${ID.toUpperCase()}`)).toEqual({
      view: 'links',
      playing: ID,
    })
  })

  it('ignora valores desconocidos e IDs no válidos', () => {
    expect(parseUrlState('?vista=otra&ver=123')).toEqual({ view: 'channels', playing: null })
  })

  it('serializa omitiendo los valores por defecto', () => {
    expect(serializeUrlState({ view: 'channels', playing: null })).toBe('')
    expect(serializeUrlState({ view: 'links', playing: ID })).toBe(`?vista=links&ver=${ID}`)
    expect(parseUrlState(serializeUrlState({ view: 'channels', playing: ID }))).toEqual({
      view: 'channels',
      playing: ID,
    })
  })
})

describe('theme', () => {
  it('resuelve la preferencia contra el sistema', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('valida la preferencia guardada y alterna', () => {
    expect(parseThemePreference('dark')).toBe('dark')
    expect(parseThemePreference('azul')).toBe('system')
    expect(nextTheme('dark')).toBe('light')
  })
})

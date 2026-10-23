import { describe, expect, it } from 'vitest'
import { formatRelative } from './format'

const now = new Date('2026-06-15T12:00:00.000Z')

describe('formatRelative', () => {
  it('indica cuando nunca se ha usado', () => {
    expect(formatRelative(null, now)).toBe('nunca')
  })

  it('formatea intervalos en español', () => {
    expect(formatRelative('2026-06-15T11:59:30.000Z', now)).toBe('ahora mismo')
    expect(formatRelative('2026-06-15T11:55:00.000Z', now)).toBe('hace 5 minutos')
    expect(formatRelative('2026-06-14T12:00:00.000Z', now)).toBe('ayer')
    expect(formatRelative('2026-04-15T12:00:00.000Z', now)).toBe('hace 2 meses')
  })
})

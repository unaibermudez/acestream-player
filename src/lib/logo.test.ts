import { describe, expect, it } from 'vitest'
import { logoFit } from './logo'

describe('logoFit', () => {
  it('trata las imágenes grandes y apaisadas como carteles', () => {
    expect(logoFit(1600, 900)).toBe('art')
    expect(logoFit(1000, 664)).toBe('art')
  })

  it('da un tamaño intermedio a los logos medianos', () => {
    expect(logoFit(440, 264)).toBe('logo')
    expect(logoFit(368, 240)).toBe('logo')
  })

  it('muestra pequeños los iconos y las imágenes casi cuadradas', () => {
    expect(logoFit(220, 132)).toBe('icon')
    expect(logoFit(180, 180)).toBe('icon')
    expect(logoFit(715, 666)).toBe('icon')
    expect(logoFit(640, 860)).toBe('icon')
  })

  it('no falla con dimensiones desconocidas', () => {
    expect(logoFit(0, 0)).toBe('icon')
  })
})

import { describe, expect, it } from 'vitest'
import { parseVersionResponse } from './engine'

describe('parseVersionResponse', () => {
  it('lee la versión de la respuesta real del motor', () => {
    expect(
      parseVersionResponse({
        result: { platform: 'linux', version: '3.2.11', code: 3021100, websocket_port: 1 },
        error: null,
      }),
    ).toBe('3.2.11')
  })

  it('devuelve null ante errores o formas inesperadas', () => {
    expect(parseVersionResponse({ result: null, error: 'fallo' })).toBeNull()
    expect(parseVersionResponse({ result: { version: 3 } })).toBeNull()
    expect(parseVersionResponse('<html>')).toBeNull()
    expect(parseVersionResponse(null)).toBeNull()
  })
})

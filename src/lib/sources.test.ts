import { describe, expect, it } from 'vitest'
import {
  describeHealth,
  isSettled,
  parseSessionStart,
  parseSessionStats,
  pickBestSource,
  sessionStartUrl,
  stopUrl,
  toProxyPath,
  type SourceHealth,
} from './sources'

const A = 'a'.repeat(40)
const B = 'b'.repeat(40)
const C = 'c'.repeat(40)

const ok = (peers: number, status = 'dl'): SourceHealth => ({
  state: 'ok',
  peers,
  speedDown: 100,
  status,
})

describe('URLs de sesión', () => {
  it('abre la sesión pidiendo el manifest en JSON', () => {
    expect(sessionStartUrl(A)).toBe(`/ace/manifest.m3u8?format=json&id=${A}`)
  })

  it('añade method=stop a la URL de comandos', () => {
    expect(stopUrl({ statUrl: '/ace/stat/x/y', commandUrl: '/ace/cmd/x/y' })).toBe(
      '/ace/cmd/x/y?method=stop',
    )
    expect(stopUrl({ statUrl: '', commandUrl: '/ace/cmd?s=1' })).toBe('/ace/cmd?s=1&method=stop')
  })

  it('convierte URLs absolutas del motor en rutas del proxy', () => {
    expect(toProxyPath('http://127.0.0.1:6878/ace/stat/abc/123')).toBe('/ace/stat/abc/123')
    expect(toProxyPath('/ace/cmd/abc/123')).toBe('/ace/cmd/abc/123')
  })

  it('descarta rutas fuera de /ace/ o valores raros', () => {
    expect(toProxyPath('http://127.0.0.1:6878/webui/x')).toBeNull()
    expect(toProxyPath(42)).toBeNull()
    expect(toProxyPath('')).toBeNull()
  })
})

describe('parseSessionStart', () => {
  it('lee las URLs de la sesión', () => {
    const data = {
      response: {
        stat_url: 'http://127.0.0.1:6878/ace/stat/h/s',
        command_url: 'http://127.0.0.1:6878/ace/cmd/h/s',
        playback_url: 'http://127.0.0.1:6878/ace/m/h/s.m3u8',
      },
      error: null,
    }
    expect(parseSessionStart(data)).toEqual({
      ok: true,
      session: { statUrl: '/ace/stat/h/s', commandUrl: '/ace/cmd/h/s' },
    })
  })

  it('devuelve el error del motor', () => {
    expect(parseSessionStart({ response: null, error: 'failed to load content' })).toEqual({
      ok: false,
      reason: 'failed to load content',
    })
  })

  it('no acepta respuestas sin URLs', () => {
    expect(parseSessionStart({ response: {}, error: null }).ok).toBe(false)
    expect(parseSessionStart('nada').ok).toBe(false)
  })
})

describe('parseSessionStats', () => {
  it('lee peers, velocidad y estado', () => {
    expect(
      parseSessionStats({ response: { status: 'dl', peers: 7, speed_down: 512 }, error: null }),
    ).toEqual({ state: 'ok', peers: 7, speedDown: 512, status: 'dl' })
  })

  it('normaliza valores ausentes o negativos', () => {
    expect(parseSessionStats({ response: { peers: -1 }, error: null })).toEqual({
      state: 'ok',
      peers: 0,
      speedDown: 0,
      status: '',
    })
  })

  it('marca como fallida una respuesta con error', () => {
    expect(parseSessionStats({ response: null, error: 'unknown session' })).toEqual({
      state: 'failed',
      reason: 'unknown session',
    })
  })
})

describe('pickBestSource', () => {
  it('elige la fuente con más peers', () => {
    expect(pickBestSource([A, B, C], { [A]: ok(2), [B]: ok(9), [C]: ok(4) })).toBe(B)
  })

  it('en empate se queda con la primera del orden', () => {
    expect(pickBestSource([A, B], { [A]: ok(5), [B]: ok(5) })).toBe(A)
  })

  it('ignora fuentes fallidas o por comprobar', () => {
    expect(
      pickBestSource([A, B, C], {
        [A]: { state: 'failed', reason: 'x' },
        [B]: { state: 'checking' },
        [C]: ok(1),
      }),
    ).toBe(C)
  })

  it('devuelve null si ninguna tiene peers', () => {
    expect(pickBestSource([A, B], { [A]: ok(0), [B]: { state: 'checking' } })).toBeNull()
  })
})

describe('isSettled y describeHealth', () => {
  it('una fuente está resuelta si falla o descarga con peers', () => {
    expect(isSettled(undefined)).toBe(false)
    expect(isSettled({ state: 'checking' })).toBe(false)
    expect(isSettled(ok(0, 'prebuf'))).toBe(false)
    expect(isSettled(ok(3, 'dl'))).toBe(true)
    expect(isSettled({ state: 'failed', reason: 'x' })).toBe(true)
  })

  it('describe el estado en pocas palabras', () => {
    expect(describeHealth(undefined)).toBeNull()
    expect(describeHealth({ state: 'checking' })).toBe('comprobando')
    expect(describeHealth({ state: 'failed', reason: 'x' })).toBe('no disponible')
    expect(describeHealth(ok(0))).toBe('sin peers')
    expect(describeHealth(ok(1))).toBe('1 peer')
    expect(describeHealth(ok(12))).toBe('12 peers')
  })
})

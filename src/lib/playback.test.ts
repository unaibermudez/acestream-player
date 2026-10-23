import { describe, expect, it } from 'vitest'
import { choosePlaybackMode, describeFailure, isAppleWebKit } from './playback'

const UA = {
  chromeDesktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
}

describe('isAppleWebKit', () => {
  it('detecta Safari e iOS pero no Chrome', () => {
    expect(isAppleWebKit(UA.safariMac, 0)).toBe(true)
    expect(isAppleWebKit(UA.iphone, 5)).toBe(true)
    expect(isAppleWebKit(UA.chromeDesktop, 0)).toBe(false)
    expect(isAppleWebKit(UA.chromeAndroid, 5)).toBe(false)
  })

  it('detecta un iPad que se identifica como Mac', () => {
    expect(isAppleWebKit(UA.safariMac, 5)).toBe(true)
  })
})

describe('choosePlaybackMode', () => {
  it('usa HLS nativo en Safari aunque haya MSE', () => {
    expect(
      choosePlaybackMode({
        nativeHls: true,
        mse: true,
        userAgent: UA.safariMac,
        maxTouchPoints: 0,
      }),
    ).toBe('native')
  })

  it('usa hls.js en Chrome aunque declare soporte HLS nativo', () => {
    expect(
      choosePlaybackMode({
        nativeHls: true,
        mse: true,
        userAgent: UA.chromeAndroid,
        maxTouchPoints: 5,
      }),
    ).toBe('hlsjs')
  })

  it('cae al nativo sin MSE y marca no soportado si no hay nada', () => {
    expect(
      choosePlaybackMode({ nativeHls: true, mse: false, userAgent: UA.firefox, maxTouchPoints: 0 }),
    ).toBe('native')
    expect(
      choosePlaybackMode({
        nativeHls: false,
        mse: false,
        userAgent: UA.firefox,
        maxTouchPoints: 0,
      }),
    ).toBe('unsupported')
  })
})

describe('describeFailure', () => {
  it('explica el 500 del motor e incluye su respuesta', () => {
    const message = describeFailure({
      kind: 'network',
      httpStatus: 500,
      responseText: 'failed to load content',
    })
    expect(message.title).toMatch(/no pudo cargar/)
    expect(message.hint).toContain('failed to load content')
  })

  it('distingue motor caído (502) de ruta mal configurada (404)', () => {
    expect(describeFailure({ kind: 'network', httpStatus: 502 }).title).toMatch(/no responde/)
    expect(describeFailure({ kind: 'network', httpStatus: 404 }).hint).toMatch(/nginx/)
  })

  it('tiene mensajes para timeout y errores de medio', () => {
    expect(describeFailure({ kind: 'timeout' }).title).toMatch(/a tiempo/)
    expect(describeFailure({ kind: 'media' }).hint).toMatch(/VLC/)
  })
})

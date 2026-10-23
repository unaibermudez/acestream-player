export type PlaybackMode = 'hlsjs' | 'native' | 'unsupported'

export interface PlaybackCapabilities {
  /** `video.canPlayType('application/vnd.apple.mpegurl') !== ''` */
  nativeHls: boolean
  /** `Hls.isSupported()` (MediaSource o ManagedMediaSource disponibles) */
  mse: boolean
  userAgent: string
  /** `navigator.maxTouchPoints`, para distinguir un iPad que se presenta como Mac. */
  maxTouchPoints: number
}

/** Safari de escritorio o cualquier navegador de iOS/iPadOS (todos usan WebKit). */
export function isAppleWebKit(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return true
  return /Safari\//.test(userAgent) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Android/.test(userAgent)
}

/**
 * En Safari/iOS se usa el HLS nativo; en el resto, hls.js. Si no hay MSE pero el navegador
 * entiende HLS (algunos Android antiguos), se intenta el nativo como último recurso.
 */
export function choosePlaybackMode(caps: PlaybackCapabilities): PlaybackMode {
  if (caps.nativeHls && isAppleWebKit(caps.userAgent, caps.maxTouchPoints)) return 'native'
  if (caps.mse) return 'hlsjs'
  if (caps.nativeHls) return 'native'
  return 'unsupported'
}

export interface PlaybackFailure {
  kind: 'network' | 'media' | 'timeout' | 'unsupported' | 'other'
  /** Código HTTP de la respuesta del manifest, si lo hubo. */
  httpStatus?: number
  /** Texto de la respuesta del motor, si lo hubo. */
  responseText?: string
  details?: string
}

export interface PlayerErrorMessage {
  title: string
  hint: string
}

/** Traduce un fallo técnico a un mensaje comprensible en español. */
export function describeFailure(failure: PlaybackFailure): PlayerErrorMessage {
  const engineText = failure.responseText?.trim().slice(0, 160)

  switch (failure.kind) {
    case 'timeout':
      return {
        title: 'El stream no ha arrancado a tiempo',
        hint: 'El motor sigue buscando peers o el canal no está emitiendo. Reintenta en unos segundos o prueba otro link.',
      }
    case 'unsupported':
      return {
        title: 'Este navegador no puede reproducir HLS',
        hint: 'Copia la URL para VLC/mpv o usa un navegador actualizado (Chrome, Firefox, Edge o Safari).',
      }
    case 'media':
      return {
        title: 'Error al decodificar el vídeo',
        hint: 'El navegador no soporta el códec de este stream. Prueba a abrirlo en VLC o mpv.',
      }
    case 'network': {
      const status = failure.httpStatus ?? 0
      if (status === 500) {
        return {
          title: 'El motor no pudo cargar el contenido',
          hint: `El ID no existe, el canal no está emitiendo o no hay peers.${engineText ? ` Respuesta del motor: «${engineText}».` : ''}`,
        }
      }
      if (status === 502 || status === 503 || status === 504) {
        return {
          title: 'El motor de Acestream no responde',
          hint: 'Comprueba que el contenedor «acestream» está en marcha (docker compose ps) y revisa sus logs.',
        }
      }
      if (status === 404) {
        return {
          title: 'No se encuentra la ruta /ace/ del motor',
          hint: 'El proxy no está redirigiendo /ace/ al motor. Revisa la configuración de nginx.',
        }
      }
      if (status > 0) {
        return {
          title: `El motor respondió con un error HTTP ${status}`,
          hint: engineText
            ? `Respuesta: «${engineText}».`
            : 'Reintenta o revisa los logs del motor.',
        }
      }
      return {
        title: 'Se perdió la conexión con el motor',
        hint: 'Revisa la conexión con el servidor y que el motor esté en marcha.',
      }
    }
    default:
      return {
        title: 'No se pudo reproducir el stream',
        hint: failure.details
          ? `Detalle técnico: ${failure.details}`
          : 'Reintenta o abre el link en VLC/mpv.',
      }
  }
}

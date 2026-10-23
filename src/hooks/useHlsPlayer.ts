// Solo tipos: la librería se carga bajo demanda al abrir el reproductor (chunk aparte).
import type HlsClass from 'hls.js'
import type { ErrorData, HlsConfig, LoaderConfig } from 'hls.js'
import { useEffect, useState, type RefObject } from 'react'
import {
  choosePlaybackMode,
  describeFailure,
  type PlaybackFailure,
  type PlayerErrorMessage,
} from '../lib/playback'

/**
 * Margen para que el motor arranque. La primera petición al manifest se queda esperando
 * mientras el motor busca peers y precarga, y eso puede llevar fácilmente 30-60 s.
 */
export const START_TIMEOUT_MS = 90_000

export type PlayerStatus = 'loading' | 'playing' | 'buffering' | 'paused' | 'blocked' | 'error'

export interface PlayerState {
  status: PlayerStatus
  error: PlayerErrorMessage | null
}

function loadPolicy(
  ttfbMs: number,
  totalMs: number,
  timeoutRetries: number,
  errorRetries: number,
): { default: LoaderConfig } {
  return {
    default: {
      maxTimeToFirstByteMs: ttfbMs,
      maxLoadTimeMs: totalMs,
      timeoutRetry: { maxNumRetry: timeoutRetries, retryDelayMs: 0, maxRetryDelayMs: 0 },
      errorRetry: { maxNumRetry: errorRetries, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
    },
  }
}

const HLS_CONFIG: Partial<HlsConfig> = {
  // Streams en directo: la barra de progreso se comporta como directo.
  liveDurationInfinity: true,
  backBufferLength: 60,
  manifestLoadPolicy: loadPolicy(START_TIMEOUT_MS, START_TIMEOUT_MS, 0, 1),
  playlistLoadPolicy: loadPolicy(20_000, 30_000, 3, 4),
  fragLoadPolicy: loadPolicy(30_000, 60_000, 4, 6),
}

function failureFromHls(Hls: typeof HlsClass, data: ErrorData): PlaybackFailure {
  if (data.type === Hls.ErrorTypes.MEDIA_ERROR) return { kind: 'media', details: data.details }
  if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
    if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT) return { kind: 'timeout' }
    const responseText =
      data.networkDetails instanceof XMLHttpRequest ? data.networkDetails.responseText : undefined
    return { kind: 'network', httpStatus: data.response?.code, responseText, details: data.details }
  }
  return { kind: 'other', details: data.details }
}

/** Tras un error del <video> nativo se repite la petición para conocer el código HTTP del motor. */
async function diagnoseNativeError(src: string, video: HTMLVideoElement): Promise<PlaybackFailure> {
  if (video.error?.code === MediaError.MEDIA_ERR_DECODE) return { kind: 'media' }
  if (video.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    try {
      const response = await fetch(src)
      if (!response.ok) {
        return { kind: 'network', httpStatus: response.status, responseText: await response.text() }
      }
    } catch {
      return { kind: 'network' }
    }
    return { kind: 'media' }
  }
  return { kind: 'network', details: video.error?.message }
}

interface KeyedState extends PlayerState {
  key: string
}

/**
 * Reproduce `src` en el <video> referenciado: hls.js en la mayoría de navegadores y HLS nativo en
 * Safari/iOS. Cambiar `src` o `attempt` destruye la instancia anterior y empieza de cero.
 */
export function useHlsPlayer(
  videoRef: RefObject<HTMLVideoElement | null>,
  src: string,
  attempt: number,
): PlayerState {
  const key = `${src}#${attempt}`
  const [state, setState] = useState<KeyedState>({ key, status: 'loading', error: null })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let disposed = false
    let started = false
    let hls: HlsClass | null = null
    let recoveredMedia = false

    const set = (status: PlayerStatus, error: PlayerErrorMessage | null = null) => {
      if (!disposed) setState({ key, status, error })
    }

    const fail = (failure: PlaybackFailure) => {
      if (disposed) return
      window.clearTimeout(timer)
      hls?.destroy()
      hls = null
      set('error', describeFailure(failure))
    }

    const timer = window.setTimeout(() => {
      if (!started) fail({ kind: 'timeout' })
    }, START_TIMEOUT_MS)

    const tryPlay = () => {
      video.play().catch((error: unknown) => {
        // El navegador bloquea el autoplay con sonido: el usuario tiene que pulsar play.
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          window.clearTimeout(timer)
          set('blocked')
        }
      })
    }

    const onPlaying = () => {
      started = true
      window.clearTimeout(timer)
      set('playing')
    }
    const onWaiting = () => {
      if (started) set('buffering')
    }
    const onPause = () => {
      if (started && !video.ended) set('paused')
    }

    video.addEventListener('playing', onPlaying)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('pause', onPause)

    const onNativeError = () => {
      void diagnoseNativeError(src, video).then(fail)
    }

    const start = async () => {
      const { default: Hls } = await import('hls.js')
      if (disposed) return

      const mode = choosePlaybackMode({
        nativeHls: video.canPlayType('application/vnd.apple.mpegurl') !== '',
        mse: Hls.isSupported(),
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
      })

      if (mode === 'hlsjs') {
        const instance = new Hls(HLS_CONFIG)
        hls = instance
        instance.on(Hls.Events.MANIFEST_PARSED, tryPlay)
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recoveredMedia) {
            recoveredMedia = true
            instance.recoverMediaError()
            return
          }
          fail(failureFromHls(Hls, data))
        })
        instance.loadSource(src)
        instance.attachMedia(video)
      } else if (mode === 'native') {
        video.addEventListener('error', onNativeError)
        video.src = src
        tryPlay()
      } else {
        fail({ kind: 'unsupported' })
      }
    }

    start().catch((error: unknown) => {
      // Normalmente, un fallo de red al descargar el chunk de hls.js.
      fail({ kind: 'other', details: error instanceof Error ? error.message : String(error) })
    })

    return () => {
      disposed = true
      window.clearTimeout(timer)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('error', onNativeError)
      hls?.destroy()
      hls = null
      // Corta la descarga en curso del modo nativo y libera el decodificador.
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [videoRef, src, key])

  return state.key === key ? state : { status: 'loading', error: null }
}

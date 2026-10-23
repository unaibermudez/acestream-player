import { useEffect, useRef, useState } from 'react'
import { useHlsPlayer } from '../hooks/useHlsPlayer'
import { copyText } from '../lib/clipboard'
import { getstreamUrl, hlsUrl, toAcestreamUri } from '../lib/links'
import type { StreamLink } from '../types/stream'
import { CloseIcon, CopyIcon, ExpandIcon, RetryIcon } from './icons'

interface Props {
  link: StreamLink
  onClose(): void
}

type WebkitVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void }

/** Segundos transcurridos desde que se monta; se reinicia con cada intento de carga. */
function Elapsed() {
  const [start] = useState(() => Date.now())
  const [now, setNow] = useState(start)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return <>{Math.round((now - start) / 1000)} s</>
}

export function Player({ link, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [copied, setCopied] = useState<string | null>(null)
  const [manualCopy, setManualCopy] = useState<string | null>(null)
  const { status, error } = useHlsPlayer(videoRef, hlsUrl(link.contentId), attempt)

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(null), 2000)
    return () => window.clearTimeout(id)
  }, [copied])

  async function copy(label: string, text: string) {
    if (await copyText(text)) {
      setManualCopy(null)
      setCopied(label)
    } else {
      setManualCopy(text)
    }
  }

  function toggleFullscreen() {
    const frame = frameRef.current
    const video = videoRef.current as WebkitVideo | null
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else if (frame?.requestFullscreen) {
      void frame.requestFullscreen()
    } else {
      // iOS en iPhone solo permite pantalla completa sobre el propio <video>.
      video?.webkitEnterFullscreen?.()
    }
  }

  const streamUrl = getstreamUrl(link.contentId, window.location.origin)

  return (
    <div className="player">
      <div className="player__header">
        <h2 className="player__title" title={link.name}>
          {link.name}
        </h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Cerrar reproductor (Esc)"
          title="Cerrar (Esc)"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="player__frame" ref={frameRef}>
        <video
          ref={videoRef}
          className="player__video"
          controls
          playsInline
          preload="auto"
          onDoubleClick={toggleFullscreen}
        />

        {(status === 'loading' || status === 'buffering') && (
          <div className="player__overlay player__overlay--passive" role="status">
            <div className="spinner" aria-hidden="true" />
            {status === 'loading' ? (
              <>
                <p>
                  Conectando con el motor… <Elapsed key={attempt} />
                </p>
                <p className="player__overlay-hint">
                  El primer arranque puede tardar hasta un minuto mientras el motor busca peers.
                </p>
              </>
            ) : (
              <p>Cargando…</p>
            )}
          </div>
        )}

        {status === 'error' && error && (
          <div className="player__overlay" role="alert">
            <p className="player__error-title">{error.title}</p>
            <p className="player__overlay-hint">{error.hint}</p>
            <button
              type="button"
              className="button button--primary"
              onClick={() => setAttempt((n) => n + 1)}
            >
              <RetryIcon /> Reintentar
            </button>
          </div>
        )}

        {status === 'blocked' && (
          <button
            type="button"
            className="player__overlay player__overlay--button"
            onClick={() => void videoRef.current?.play()}
          >
            <span className="player__big-play" aria-hidden="true">
              ▶
            </span>
            Pulsa para reproducir
          </button>
        )}
      </div>

      <div className="player__actions">
        <button
          type="button"
          className="button"
          onClick={() => void copy('vlc', streamUrl)}
          title={streamUrl}
        >
          <CopyIcon /> {copied === 'vlc' ? '¡Copiada!' : 'URL para VLC/mpv'}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => void copy('ace', toAcestreamUri(link.contentId))}
        >
          <CopyIcon /> {copied === 'ace' ? '¡Copiado!' : 'acestream://'}
        </button>
        <button type="button" className="button" onClick={toggleFullscreen}>
          <ExpandIcon /> Pantalla completa
        </button>
      </div>

      {manualCopy && (
        <div className="player__manual-copy">
          <label>
            No se pudo copiar automáticamente. Selecciona y copia:
            <input
              className="input"
              readOnly
              value={manualCopy}
              onFocus={(event) => event.target.select()}
              autoFocus
            />
          </label>
        </div>
      )}
    </div>
  )
}

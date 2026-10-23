import { useEffect, useRef, useState } from 'react'
import { useHlsPlayer } from '../../hooks/useHlsPlayer'
import { copyText } from '../../lib/clipboard'
import { getstreamUrl, hlsUrl, toAcestreamUri } from '../../lib/links'
import { CloseIcon, CopyIcon, ExpandIcon, PlayIcon, RetryIcon, StarIcon } from '../icons'
import { Button, Chip, IconButton } from '../ui/Button'
import './player.css'

export interface PlayerSource {
  contentId: string
  label: string
  title: string
}

interface Props {
  title: string
  /** Contexto corto bajo el título (categoría, etiquetas…). */
  subtitle?: string
  contentId: string
  /** Fuentes alternativas del mismo canal; se muestran como selector si hay más de una. */
  sources?: PlayerSource[]
  onSelectSource?(source: PlayerSource): void
  /** Si se pasa, aparece el botón para guardar el stream en "Mis links". */
  onSave?(): void
  saved?: boolean
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
  return <span className="mono">{Math.round((now - start) / 1000)}&nbsp;s</span>
}

/** Reproductor en formato teatro: vídeo arriba a todo el ancho y debajo título, fuentes y acciones. */
export function Player({
  title,
  subtitle,
  contentId,
  sources = [],
  onSelectSource,
  onSave,
  saved = false,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [copied, setCopied] = useState<'vlc' | 'ace' | null>(null)
  const [manualCopy, setManualCopy] = useState<string | null>(null)
  const { status, error } = useHlsPlayer(videoRef, hlsUrl(contentId), attempt)

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(null), 2000)
    return () => window.clearTimeout(id)
  }, [copied])

  async function copy(kind: 'vlc' | 'ace', text: string) {
    if (await copyText(text)) {
      setManualCopy(null)
      setCopied(kind)
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

  const streamUrl = getstreamUrl(contentId, window.location.origin)
  const showSources = sources.length > 1 && onSelectSource

  return (
    <section className="stage" aria-label={`Reproduciendo ${title}`}>
      <div className="stage__frame" ref={frameRef}>
        <video
          ref={videoRef}
          className="stage__video"
          // Sin controles nativos mientras hay un overlay: evita el spinner nativo detrás del nuestro.
          controls={status !== 'loading' && status !== 'error' && status !== 'blocked'}
          playsInline
          preload="auto"
          onDoubleClick={toggleFullscreen}
        />

        {(status === 'loading' || status === 'buffering') && (
          <div className="stage__overlay stage__overlay--passive" role="status">
            <div className="spinner" aria-hidden="true" />
            {status === 'loading' ? (
              <>
                <p className="stage__overlay-title">
                  Conectando con el motor… <Elapsed key={attempt} />
                </p>
                <p className="stage__overlay-hint">
                  El primer arranque puede tardar hasta un minuto mientras el motor busca peers.
                </p>
              </>
            ) : (
              <p className="stage__overlay-title">Cargando…</p>
            )}
          </div>
        )}

        {status === 'error' && error && (
          <div className="stage__overlay" role="alert">
            <p className="stage__error-title">{error.title}</p>
            <p className="stage__overlay-hint">{error.hint}</p>
            <div className="stage__overlay-actions">
              <button
                type="button"
                className="stage__retry"
                onClick={() => setAttempt((n) => n + 1)}
              >
                <RetryIcon /> Reintentar
              </button>
              {showSources && (
                <span className="stage__overlay-hint">o prueba otra fuente debajo</span>
              )}
            </div>
          </div>
        )}

        {status === 'blocked' && (
          <button
            type="button"
            className="stage__overlay stage__overlay--button"
            onClick={() => void videoRef.current?.play()}
          >
            <span className="stage__big-play" aria-hidden="true">
              <PlayIcon width={28} height={28} />
            </span>
            Pulsa para reproducir
          </button>
        )}
      </div>

      <div className="stage__info">
        <div className="stage__heading">
          <h2 className="stage__title" translate="no">
            {title}
          </h2>
          {subtitle && <p className="stage__subtitle">{subtitle}</p>}
        </div>
        <IconButton variant="outline" label="Cerrar reproductor (Esc)" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>

      {showSources && (
        <div className="stage__sources" role="group" aria-label="Fuentes del canal">
          <span className="stage__sources-label">Fuente</span>
          {sources.map((source) => (
            <Chip
              key={source.contentId}
              tone="data"
              pressed={source.contentId === contentId}
              onClick={() => onSelectSource(source)}
              title={source.title}
            >
              {source.label}
            </Chip>
          ))}
        </div>
      )}

      <div className="stage__actions">
        {onSave && (
          <Button
            variant={saved ? 'secondary' : 'primary'}
            icon={<StarIcon filled={saved} />}
            onClick={onSave}
            disabled={saved}
          >
            {saved ? 'Guardado en Mis links' : 'Guardar en Mis links'}
          </Button>
        )}
        <Button icon={<CopyIcon />} onClick={() => void copy('vlc', streamUrl)} title={streamUrl}>
          {copied === 'vlc' ? 'URL copiada' : 'Copiar URL para VLC'}
        </Button>
        <Button icon={<CopyIcon />} onClick={() => void copy('ace', toAcestreamUri(contentId))}>
          {copied === 'ace' ? 'Link copiado' : 'Copiar acestream://'}
        </Button>
        <Button variant="ghost" icon={<ExpandIcon />} onClick={toggleFullscreen}>
          Pantalla completa
        </Button>
      </div>

      {manualCopy && (
        <label className="stage__manual-copy field-stack">
          No se pudo copiar automáticamente. Selecciona el texto y cópialo:
          <input
            className="field"
            name="manual-copy"
            readOnly
            value={manualCopy}
            onFocus={(event) => event.target.select()}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      )}
    </section>
  )
}

import { useRef, type ChangeEvent } from 'react'
import { buildExport, exportFileName } from '../lib/exchange'
import type { StreamLink } from '../types/stream'
import { DownloadIcon, UploadIcon } from './icons'

interface Props {
  links: StreamLink[]
  onImportText(text: string, fileName: string): void
}

function download(fileName: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Se libera en el siguiente ciclo para no cortar la descarga en Safari.
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function ImportExport({ links, onImportText }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const now = new Date()
    download(
      exportFileName(now),
      JSON.stringify(buildExport(links, now), null, 2),
      'application/json',
    )
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Se limpia para poder volver a elegir el mismo archivo.
    event.target.value = ''
    if (file) onImportText(await file.text(), file.name)
  }

  return (
    <div className="import-export">
      <button
        type="button"
        className="button"
        onClick={() => fileRef.current?.click()}
        title="Importar JSON, M3U o texto"
      >
        <UploadIcon />
        <span className="hide-narrow">Importar</span>
      </button>
      <button
        type="button"
        className="button"
        onClick={handleExport}
        disabled={links.length === 0}
        title="Descargar la lista en JSON"
      >
        <DownloadIcon />
        <span className="hide-narrow">Exportar</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.m3u,.m3u8,.txt,application/json,audio/x-mpegurl,application/vnd.apple.mpegurl,text/plain"
        onChange={(event) => void handleFile(event)}
        hidden
      />
    </div>
  )
}

import { useRef, type ChangeEvent } from 'react'
import { buildExport, exportFileName } from '../../lib/exchange'
import type { StreamLink } from '../../types/stream'
import { DownloadIcon, UploadIcon } from '../icons'
import { Button } from '../ui/Button'

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

/** Copia de seguridad de "Mis links": exportar a JSON e importar JSON, M3U o texto. */
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
      <Button
        size="sm"
        icon={<UploadIcon width={16} height={16} />}
        onClick={() => fileRef.current?.click()}
        title="Importar un JSON exportado, una lista M3U o texto con un link por línea"
      >
        Importar
      </Button>
      <Button
        size="sm"
        icon={<DownloadIcon width={16} height={16} />}
        onClick={handleExport}
        disabled={links.length === 0}
        title="Descargar todos tus links en un archivo JSON"
      >
        Exportar
      </Button>
      <input
        ref={fileRef}
        type="file"
        name="import"
        accept=".json,.m3u,.m3u8,.txt,application/json,audio/x-mpegurl,application/vnd.apple.mpegurl,text/plain"
        onChange={(event) => void handleFile(event)}
        hidden
      />
    </div>
  )
}

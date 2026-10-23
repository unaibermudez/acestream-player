import { useCallback, useEffect, useRef, useState } from 'react'
import { parseUrlState, serializeUrlState, type UrlState, type View } from '../lib/urlState'

/** Marca las entradas de historial creadas al abrir el reproductor, para que cerrar sea "atrás". */
interface HistoryMark {
  acestreamPlayer: 'player'
}

function isPlayerEntry(state: unknown): state is HistoryMark {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as HistoryMark).acestreamPlayer === 'player'
  )
}

function write(state: UrlState, mode: 'push' | 'replace', mark: HistoryMark | null = null) {
  const url = `${window.location.pathname}${serializeUrlState(state)}${window.location.hash}`
  if (mode === 'push') window.history.pushState(mark, '', url)
  else window.history.replaceState(mark ?? window.history.state, '', url)
}

/**
 * Vista y stream activo reflejados en la URL (`?vista=links&ver=<id>`). Abrir el reproductor
 * añade una entrada al historial, así que el botón "atrás" del navegador o del móvil lo cierra.
 */
export function useUrlState(): {
  state: UrlState
  setView(view: View): void
  play(contentId: string): void
  close(): void
} {
  const [state, setState] = useState<UrlState>(() => parseUrlState(window.location.search))
  // Copia síncrona: el historial se escribe fuera de los updaters de setState (StrictMode los repite).
  const current = useRef(state)

  const apply = useCallback((next: UrlState) => {
    current.current = next
    setState(next)
  }, [])

  useEffect(() => {
    const onPop = () => apply(parseUrlState(window.location.search))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [apply])

  const setView = useCallback(
    (view: View) => {
      const next = { ...current.current, view }
      write(next, 'replace')
      apply(next)
    },
    [apply],
  )

  const play = useCallback(
    (contentId: string) => {
      const next = { ...current.current, playing: contentId }
      // Cambiar de canal con el reproductor abierto no apila más entradas de historial.
      if (current.current.playing && isPlayerEntry(window.history.state)) write(next, 'replace')
      else write(next, 'push', { acestreamPlayer: 'player' })
      apply(next)
    },
    [apply],
  )

  const close = useCallback(() => {
    if (isPlayerEntry(window.history.state)) {
      // La entrada la creó play(): volver atrás restaura la URL anterior y dispara popstate.
      window.history.back()
      return
    }
    const next = { ...current.current, playing: null }
    write(next, 'replace')
    apply(next)
  }, [apply])

  return { state, setView, play, close }
}

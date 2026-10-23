import { useEffect, useRef } from 'react'

export interface Shortcuts {
  onFocusSearch(): void
  onEscape(): void
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** `/` enfoca la búsqueda y `Esc` cierra el reproductor (salvo mientras se escribe en un campo). */
export function useKeyboardShortcuts(shortcuts: Shortcuts): void {
  // Ref para no tener que volver a registrar el listener en cada render.
  const latest = useRef(shortcuts)
  useEffect(() => {
    latest.current = shortcuts
  })

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      if (isTyping(event.target)) return
      if (event.key === '/') {
        event.preventDefault()
        latest.current.onFocusSearch()
      } else if (event.key === 'Escape') {
        latest.current.onEscape()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}

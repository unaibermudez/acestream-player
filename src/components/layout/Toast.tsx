import { useEffect } from 'react'
import { CloseIcon } from '../icons'
import { IconButton } from '../ui/Button'

export interface ToastMessage {
  id: number
  kind: 'ok' | 'warn' | 'error'
  text: string
  action?: { label: string; run(): void }
}

const DURATION_MS = 7000

/** Aviso flotante abajo del todo. Se anuncia con aria-live y desaparece solo. */
export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss(): void }) {
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(onDismiss, DURATION_MS)
    return () => window.clearTimeout(id)
  }, [toast, onDismiss])

  return (
    <div className="toast-region" aria-live="polite">
      {toast && (
        <div key={toast.id} className={`toast toast--${toast.kind}`} role="status">
          <span className="toast__text">{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                toast.action?.run()
                onDismiss()
              }}
            >
              {toast.action.label}
            </button>
          )}
          <IconButton label="Cerrar aviso" onClick={onDismiss} className="toast__close">
            <CloseIcon width={16} height={16} />
          </IconButton>
        </div>
      )}
    </div>
  )
}

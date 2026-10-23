import type { EngineStatus as Status } from '../../hooks/useEngineStatus'

/** Indicador del motor: punto de color + texto corto. El detalle va en el tooltip. */
export function EngineStatus({ status }: { status: Status }) {
  const label =
    status.state === 'online'
      ? 'Motor activo'
      : status.state === 'offline'
        ? 'Motor sin respuesta'
        : 'Comprobando motor…'
  const detail =
    status.state === 'online'
      ? `Acestream ${status.version}`
      : status.state === 'offline'
        ? status.reason
        : ''

  return (
    <span
      className={`engine engine--${status.state}`}
      role="status"
      title={detail ? `${label} (${detail})` : label}
    >
      <span className="engine__dot" aria-hidden="true" />
      <span className="engine__label">{label}</span>
      {status.state === 'online' && (
        <span className="engine__version" translate="no">
          {status.version}
        </span>
      )}
    </span>
  )
}

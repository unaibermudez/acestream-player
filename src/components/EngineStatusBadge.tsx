import type { EngineStatus } from '../hooks/useEngineStatus'

export function EngineStatusBadge({ status }: { status: EngineStatus }) {
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
      className={`engine-status engine-status--${status.state}`}
      role="status"
      title={detail ? `${label} (${detail})` : label}
    >
      <span className="engine-status__dot" aria-hidden="true" />
      <span className="engine-status__label">{label}</span>
    </span>
  )
}

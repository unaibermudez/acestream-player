/**
 * Comprobación de las fuentes de un canal con la API JSON del motor:
 *
 * 1. `GET /ace/manifest.m3u8?format=json&id=…` abre una sesión y devuelve sus URLs
 *    (`stat_url`, `command_url`, `playback_url`) en lugar del manifest.
 * 2. `GET <stat_url>` informa del estado de la descarga: `status`, `peers`, `speed_down`…
 * 3. `GET <command_url>?method=stop` cierra la sesión.
 *
 * Todo pasa por el proxy del mismo origen, así que las URLs absolutas del motor se convierten
 * en rutas relativas.
 */

/** Sesión abierta en el motor para una fuente. */
export interface EngineSession {
  statUrl: string
  commandUrl: string
}

/** Estado de una fuente durante la comprobación. */
export type SourceHealth =
  | { state: 'checking' }
  | { state: 'ok'; peers: number; speedDown: number; status: string }
  | { state: 'failed'; reason: string }

export function sessionStartUrl(contentId: string): string {
  return `/ace/manifest.m3u8?format=json&id=${contentId}`
}

export function stopUrl(session: EngineSession): string {
  return `${session.commandUrl}${session.commandUrl.includes('?') ? '&' : '?'}method=stop`
}

/**
 * `http://127.0.0.1:6878/ace/stat/…` → `/ace/stat/…`. Solo acepta rutas bajo `/ace/`, que son
 * las que el proxy reenvía al motor; cualquier otra cosa se descarta.
 */
export function toProxyPath(url: unknown): string | null {
  if (typeof url !== 'string' || !url) return null
  let path: string
  try {
    const parsed = new URL(url, 'http://engine.invalid')
    path = `${parsed.pathname}${parsed.search}`
  } catch {
    return null
  }
  return path.startsWith('/ace/') ? path : null
}

type Envelope = { response?: unknown; error?: unknown }

function envelope(data: unknown): Envelope {
  return typeof data === 'object' && data !== null ? (data as Envelope) : {}
}

function errorText(error: unknown): string {
  return typeof error === 'string' && error ? error : 'respuesta inesperada del motor'
}

/** Respuesta de `format=json` → sesión, o el motivo del fallo (`failed to load content`…). */
export function parseSessionStart(
  data: unknown,
): { ok: true; session: EngineSession } | { ok: false; reason: string } {
  const { response, error } = envelope(data)
  if (error || typeof response !== 'object' || response === null) {
    return { ok: false, reason: errorText(error) }
  }
  const { stat_url, command_url } = response as { stat_url?: unknown; command_url?: unknown }
  const statUrl = toProxyPath(stat_url)
  const commandUrl = toProxyPath(command_url)
  if (!statUrl || !commandUrl) return { ok: false, reason: 'respuesta inesperada del motor' }
  return { ok: true, session: { statUrl, commandUrl } }
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

/** Respuesta de `stat_url` → estado de la fuente. */
export function parseSessionStats(data: unknown): SourceHealth {
  const { response, error } = envelope(data)
  if (error || typeof response !== 'object' || response === null) {
    return { state: 'failed', reason: errorText(error) }
  }
  const { peers, speed_down, status } = response as {
    peers?: unknown
    speed_down?: unknown
    status?: unknown
  }
  return {
    state: 'ok',
    peers: count(peers),
    speedDown: count(speed_down),
    status: typeof status === 'string' ? status : '',
  }
}

/** Ya se sabe todo lo necesario de esta fuente: ha fallado o está descargando con peers. */
export function isSettled(health: SourceHealth | undefined): boolean {
  if (!health || health.state === 'checking') return false
  return health.state === 'failed' || (health.status === 'dl' && health.peers > 0)
}

/**
 * La fuente con más peers. En caso de empate gana la que va antes en `order` (el catálogo ya las
 * ordena por calidad). `null` si ninguna tiene peers: entonces no merece la pena cambiar.
 */
export function pickBestSource(
  order: readonly string[],
  health: Readonly<Record<string, SourceHealth>>,
): string | null {
  let best: string | null = null
  let bestPeers = 0
  for (const id of order) {
    const h = health[id]
    if (h?.state === 'ok' && h.peers > bestPeers) {
      best = id
      bestPeers = h.peers
    }
  }
  return best
}

/** Texto corto para la píldora de la fuente. */
export function describeHealth(health: SourceHealth | undefined): string | null {
  if (!health) return null
  if (health.state === 'checking') return 'comprobando'
  if (health.state === 'failed') return 'no disponible'
  if (health.peers === 0) return 'sin peers'
  return health.peers === 1 ? '1 peer' : `${health.peers} peers`
}

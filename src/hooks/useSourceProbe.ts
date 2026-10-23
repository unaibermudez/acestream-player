import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isSettled,
  parseSessionStart,
  parseSessionStats,
  pickBestSource,
  sessionStartUrl,
  stopUrl,
  type EngineSession,
  type SourceHealth,
} from '../lib/sources'

/** Tiempo máximo comprobando: después se elige con lo que se sepa. */
export const PROBE_MAX_MS = 12_000
/** Tiempo mínimo antes de dar por buena una respuesta rápida: los peers tardan en llegar. */
export const PROBE_MIN_MS = 4_000
const POLL_MS = 1_500

export type ProbePhase = 'idle' | 'checking' | 'done'

export interface SourceProbe {
  phase: ProbePhase
  /** Estado de cada fuente por content ID. */
  health: Record<string, SourceHealth>
  /** Fuente elegida al terminar, o `null` si ninguna destacaba o se canceló. */
  best: string | null
  /**
   * Deja de comprobar sin elegir nada. `keepId` es la fuente que se va a reproducir: su sesión
   * no se cierra, para no cortar la descarga que el vídeo está a punto de usar.
   */
  cancel(keepId?: string): void
}

interface ProbeState {
  key: string
  phase: ProbePhase
  health: Record<string, SourceHealth>
  best: string | null
}

const IDLE: ProbeState = { key: '', phase: 'idle', health: {}, best: null }

async function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, cache: 'no-store' })
  return response.json()
}

function stopSession(session: EngineSession) {
  // Sin esperar respuesta: si falla, el motor cierra la sesión solo por inactividad.
  fetch(stopUrl(session), { cache: 'no-store', keepalive: true }).catch(() => {})
}

/**
 * Abre una sesión en el motor por cada fuente, consulta sus peers unos segundos y elige la mejor.
 * La sesión de la fuente elegida se mantiene (el motor ya tiene la descarga en marcha y el vídeo
 * arranca antes); las demás se cierran al terminar. Todo se cierra al cambiar de canal o cerrar.
 *
 * `contentIds` es `null` para no comprobar nada; con menos de dos fuentes tampoco se comprueba.
 */
export function useSourceProbe(contentIds: readonly string[] | null): SourceProbe {
  const key = contentIds && contentIds.length > 1 ? contentIds.join(',') : ''
  const [state, setState] = useState<ProbeState>(IDLE)
  const cancelRef = useRef<(keepId?: string) => void>(() => {})

  useEffect(() => {
    if (!key) return
    const ids = key.split(',')
    const controller = new AbortController()
    const sessions = new Map<string, EngineSession>()
    let health: Record<string, SourceHealth> = Object.fromEntries(
      ids.map((id) => [id, { state: 'checking' } as SourceHealth]),
    )
    const startedAt = Date.now()
    let finished = false
    let pollTimer = 0
    let keep: string | null = null

    const publish = (phase: ProbePhase, best: string | null = null) => {
      if (!controller.signal.aborted) setState({ key, phase, health: { ...health }, best })
    }

    const finish = (choose: boolean, keepId?: string) => {
      if (finished) return
      finished = true
      window.clearTimeout(pollTimer)
      const best = choose ? pickBestSource(ids, health) : null
      // Se mantiene la sesión de lo que se va a reproducir: la elegida, la indicada o, si
      // ninguna destaca, la primera (la que ya estaba abierta en el reproductor).
      keep = best ?? keepId ?? ids[0] ?? null
      for (const [id, session] of sessions) if (id !== keep) stopSession(session)
      // Sin respuesta a tiempo cuenta como fallo; si se canceló, simplemente no se sabe.
      for (const id of ids) {
        if (health[id]?.state === 'checking' && choose) {
          health[id] = { state: 'failed', reason: 'sin respuesta' }
        }
      }
      if (!choose) {
        health = Object.fromEntries(
          Object.entries(health).filter(([, h]) => h.state !== 'checking'),
        )
      }
      publish('done', best)
    }
    cancelRef.current = (keepId) => finish(false, keepId)

    const poll = async () => {
      await Promise.all(
        [...sessions].map(async ([id, session]) => {
          try {
            health[id] = parseSessionStats(await getJson(session.statUrl, controller.signal))
          } catch {
            // Un fallo puntual no descarta la fuente: se reintenta en la siguiente vuelta.
          }
        }),
      )
      if (finished || controller.signal.aborted) return
      const elapsed = Date.now() - startedAt
      const allSettled = ids.every((id) => isSettled(health[id]))
      if (elapsed >= PROBE_MAX_MS || (elapsed >= PROBE_MIN_MS && allSettled)) {
        finish(true)
        return
      }
      publish('checking')
      pollTimer = window.setTimeout(() => void poll(), POLL_MS)
    }

    const deadline = window.setTimeout(() => finish(true), PROBE_MAX_MS + POLL_MS)

    publish('checking')
    void Promise.all(
      ids.map(async (id) => {
        try {
          const result = parseSessionStart(await getJson(sessionStartUrl(id), controller.signal))
          if (!result.ok) {
            health[id] = { state: 'failed', reason: result.reason }
            return
          }
          // Llegó tarde: se cierra, salvo si es la fuente que se va a reproducir.
          if (controller.signal.aborted || (finished && id !== keep)) {
            stopSession(result.session)
            return
          }
          sessions.set(id, result.session)
        } catch {
          if (!controller.signal.aborted) health[id] = { state: 'failed', reason: 'sin respuesta' }
        }
      }),
    ).then(() => {
      if (finished || controller.signal.aborted) return
      if (sessions.size === 0) finish(true)
      else void poll()
    })

    return () => {
      window.clearTimeout(pollTimer)
      window.clearTimeout(deadline)
      controller.abort()
      finished = true
      cancelRef.current = () => {}
      // Al salir del canal se cierra lo que quede abierto, incluida la sesión que se mantuvo.
      for (const [id, session] of sessions) if (!keep || id === keep) stopSession(session)
    }
  }, [key])

  const cancel = useCallback((keepId?: string) => cancelRef.current(keepId), [])

  if (!key || state.key !== key) {
    return { phase: key ? 'checking' : 'idle', health: {}, best: null, cancel }
  }
  return { phase: state.phase, health: state.health, best: state.best, cancel }
}

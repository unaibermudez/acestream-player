import { useEffect, useState } from 'react'
import { ENGINE_VERSION_URL, parseVersionResponse } from '../lib/engine'

export type EngineStatus =
  | { state: 'checking' }
  | { state: 'online'; version: string }
  | { state: 'offline'; reason: string }

const POLL_MS = 15_000
const REQUEST_TIMEOUT_MS = 5_000

async function checkEngine(): Promise<EngineStatus> {
  try {
    const response = await fetch(ENGINE_VERSION_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) return { state: 'offline', reason: `HTTP ${response.status}` }
    const version = parseVersionResponse(await response.json())
    return version
      ? { state: 'online', version }
      : { state: 'offline', reason: 'Respuesta inesperada' }
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError'
    return { state: 'offline', reason: timedOut ? 'Sin respuesta' : 'Error de red' }
  }
}

/** Consulta el motor periódicamente mientras la pestaña está visible. */
export function useEngineStatus(): EngineStatus {
  const [status, setStatus] = useState<EngineStatus>({ state: 'checking' })

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    const run = async () => {
      window.clearTimeout(timer)
      const next = await checkEngine()
      if (cancelled) return
      setStatus(next)
      if (document.visibilityState === 'visible') timer = window.setTimeout(run, POLL_MS)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void run()
      else window.clearTimeout(timer)
    }

    void run()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return status
}

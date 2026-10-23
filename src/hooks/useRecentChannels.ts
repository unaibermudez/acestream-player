import { useCallback, useState } from 'react'
import { parseRecent, pushRecent, type RecentEntry } from '../lib/recent'

const RECENT_KEY = 'acestream-player:recent:v1'

function read(): RecentEntry[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    return raw ? parseRecent(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

/** Historial de canales vistos en este navegador, del más reciente al más antiguo. */
export function useRecentChannels(): {
  recent: RecentEntry[]
  remember(channelKey: string, contentId: string): void
} {
  const [recent, setRecent] = useState<RecentEntry[]>(read)

  const remember = useCallback((channelKey: string, contentId: string) => {
    setRecent((list) => {
      const next = pushRecent(list, { channelKey, contentId, playedAt: new Date().toISOString() })
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        // Si no se puede guardar, el historial dura lo que la pestaña.
      }
      return next
    })
  }, [])

  return { recent, remember }
}

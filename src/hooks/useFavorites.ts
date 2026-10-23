import { useCallback, useState } from 'react'
import { parseFavorites, toggleFavorite } from '../lib/favorites'

const FAVORITES_KEY = 'acestream-player:favorites:v1'

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY)
    return raw ? parseFavorites(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

/** Canales favoritos del catálogo en este navegador (claves de canal). */
export function useFavorites(): { favorites: string[]; toggle(channelKey: string): void } {
  const [favorites, setFavorites] = useState<string[]>(read)

  const toggle = useCallback((channelKey: string) => {
    setFavorites((list) => {
      const next = toggleFavorite(list, channelKey)
      try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
      } catch {
        // Si no se puede guardar, los favoritos duran lo que la pestaña.
      }
      return next
    })
  }, [])

  return { favorites, toggle }
}

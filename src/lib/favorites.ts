/** Canales favoritos del catálogo: lista de claves de canal, el más reciente primero. */

export const MAX_FAVORITES = 200

/** Añade la clave al principio si no estaba, o la quita si ya estaba. */
export function toggleFavorite(list: readonly string[], key: string): string[] {
  return list.includes(key)
    ? list.filter((item) => item !== key)
    : [key, ...list].slice(0, MAX_FAVORITES)
}

/** Valida lo leído del almacenamiento: solo cadenas no vacías y sin repetir. */
export function parseFavorites(data: unknown): string[] {
  if (!Array.isArray(data)) return []
  const keys = data.filter((item): item is string => typeof item === 'string' && item !== '')
  return [...new Set(keys)].slice(0, MAX_FAVORITES)
}

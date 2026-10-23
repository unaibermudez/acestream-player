/** Un canal reproducido recientemente: se guarda la clave del canal y la fuente usada. */
export interface RecentEntry {
  channelKey: string
  contentId: string
  playedAt: string
}

export const MAX_RECENT = 12

/** Añade al principio, quita la entrada anterior del mismo canal y recorta a `max`. */
export function pushRecent(
  list: RecentEntry[],
  entry: RecentEntry,
  max: number = MAX_RECENT,
): RecentEntry[] {
  return [entry, ...list.filter((item) => item.channelKey !== entry.channelKey)].slice(0, max)
}

/** Valida lo leído del almacenamiento; descarta entradas mal formadas. */
export function parseRecent(data: unknown): RecentEntry[] {
  if (!Array.isArray(data)) return []
  return data.filter(
    (item): item is RecentEntry =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as RecentEntry).channelKey === 'string' &&
      typeof (item as RecentEntry).contentId === 'string' &&
      typeof (item as RecentEntry).playedAt === 'string',
  )
}

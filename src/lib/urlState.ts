import { isContentId } from './links'

export type View = 'channels' | 'links'

/** Estado de la app que vive en la URL: sobrevive a recargas y se puede enlazar. */
export interface UrlState {
  view: View
  /** Content ID que se está reproduciendo, o `null`. */
  playing: string | null
}

export const DEFAULT_URL_STATE: UrlState = { view: 'channels', playing: null }

/** `?vista=links&ver=<id>` → estado. Ignora valores desconocidos o IDs no válidos. */
export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search)
  const playing = params.get('ver')?.toLowerCase() ?? null
  return {
    view: params.get('vista') === 'links' ? 'links' : 'channels',
    playing: playing && isContentId(playing) ? playing : null,
  }
}

/** Estado → query string (con `?`), o cadena vacía si todo está por defecto. */
export function serializeUrlState(state: UrlState): string {
  const params = new URLSearchParams()
  if (state.view === 'links') params.set('vista', 'links')
  if (state.playing) params.set('ver', state.playing)
  const query = params.toString()
  return query ? `?${query}` : ''
}

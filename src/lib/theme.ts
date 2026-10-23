export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_KEY = 'acestream-player:theme'

/** Colores de fondo de cada tema, para `<meta name="theme-color">`. Deben coincidir con tokens.css. */
export const THEME_BACKGROUND: Record<ResolvedTheme, string> = {
  light: '#F5F2EA',
  dark: '#181611',
}

export function parseThemePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemDark ? 'dark' : 'light'
  return preference
}

/** El botón alterna entre claro y oscuro partiendo del tema que se ve ahora. */
export function nextTheme(current: ResolvedTheme): ResolvedTheme {
  return current === 'dark' ? 'light' : 'dark'
}

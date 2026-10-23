import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import {
  nextTheme,
  parseThemePreference,
  resolveTheme,
  THEME_BACKGROUND,
  THEME_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from '../lib/theme'

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

function subscribeSystem(onChange: () => void) {
  const query = darkQuery()
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function readPreference(): ThemePreference {
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_KEY))
  } catch {
    return 'system'
  }
}

/**
 * Tema claro/oscuro: sigue al sistema hasta que se elige uno con el botón. index.html aplica
 * el mismo cálculo en un script bloqueante para que no haya destello al cargar.
 */
export function useTheme(): { theme: ResolvedTheme; toggle(): void } {
  const [preference, setPreference] = useState<ThemePreference>(readPreference)
  const systemDark = useSyncExternalStore(subscribeSystem, () => darkQuery().matches)
  const theme = resolveTheme(preference, systemDark)

  useEffect(() => {
    const root = document.documentElement
    if (preference === 'system') root.removeAttribute('data-theme')
    else root.dataset.theme = preference
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_BACKGROUND[theme])
  }, [preference, theme])

  const toggle = useCallback(() => {
    const next = nextTheme(theme)
    setPreference(next)
    try {
      window.localStorage.setItem(THEME_KEY, next)
    } catch {
      // Preferencia opcional: sin almacenamiento, el tema dura lo que la pestaña.
    }
  }, [theme])

  return { theme, toggle }
}

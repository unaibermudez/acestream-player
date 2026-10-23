import type { MouseEvent, ReactNode } from 'react'
import type { EngineStatus as Status } from '../../hooks/useEngineStatus'
import type { ResolvedTheme } from '../../lib/theme'
import { serializeUrlState, type View } from '../../lib/urlState'
import { MoonIcon, SunIcon } from '../icons'
import { IconButton } from '../ui/Button'
import { EngineStatus } from './EngineStatus'
import './layout.css'

interface Props {
  view: View
  linkCount: number
  engine: Status
  theme: ResolvedTheme
  onToggleTheme(): void
  onNavigate(view: View): void
  /** Acciones propias de la vista actual (importar/exportar…). */
  actions?: ReactNode
}

const NAV: { view: View; label: string }[] = [
  { view: 'channels', label: 'Canales' },
  { view: 'links', label: 'Mis links' },
]

export function AppHeader({
  view,
  linkCount,
  engine,
  theme,
  onToggleTheme,
  onNavigate,
  actions,
}: Props) {
  function handleNav(event: MouseEvent<HTMLAnchorElement>, target: View) {
    // Ctrl/Cmd/clic central abren en otra pestaña como cualquier enlace.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    onNavigate(target)
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <a className="app-header__brand" href="/" onClick={(event) => handleNav(event, 'channels')}>
          <img src="/icon.svg" alt="" width="26" height="26" />
          <span translate="no">Acestream</span>
        </a>

        <nav className="app-nav" aria-label="Secciones">
          {NAV.map((item) => (
            <a
              key={item.view}
              className="app-nav__link"
              href={serializeUrlState({ view: item.view, playing: null }) || '/'}
              aria-current={view === item.view ? 'page' : undefined}
              onClick={(event) => handleNav(event, item.view)}
            >
              {item.label}
              {item.view === 'links' && linkCount > 0 && (
                <span className="app-nav__count">{linkCount}</span>
              )}
            </a>
          ))}
        </nav>

        <div className="app-header__tools">
          {actions}
          <EngineStatus status={engine} />
          <IconButton
            variant="outline"
            label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </IconButton>
        </div>
      </div>
    </header>
  )
}

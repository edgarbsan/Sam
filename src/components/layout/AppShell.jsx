import { NavLink, useNavigate } from 'react-router-dom'
import { TruckIcon, HistoryIcon, SettingsIcon, BackIcon } from './Icons.jsx'

const NAV = [
  { to: '/nueva', label: 'Nueva', Icon: TruckIcon },
  { to: '/historial', label: 'Historial', Icon: HistoryIcon },
  { to: '/ajustes', label: 'Ajustes', Icon: SettingsIcon },
]

export function AppShell({ title, subtitle, back, action, children, hideNav = false }) {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-full flex-col bg-ink-950">
      <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/90 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          {back && (
            <button
              onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
              className="-ml-2 rounded-full p-2 text-zinc-400 hover:bg-ink-800 hover:text-zinc-100"
              aria-label="Regresar"
            >
              <BackIcon className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-zinc-50">{title}</h1>
            {subtitle && <p className="truncate text-xs text-zinc-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>

      <main className={`mx-auto w-full max-w-lg flex-1 px-4 py-4 ${hideNav ? 'pb-safe' : 'pb-28'}`}>{children}</main>

      {!hideNav && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-800 bg-ink-950/95 pb-safe backdrop-blur">
          <div className="mx-auto grid max-w-lg grid-cols-3">
            {NAV.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                    isActive ? 'text-brand-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-6 w-6 ${isActive ? 'text-brand-400' : ''}`} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

export default AppShell

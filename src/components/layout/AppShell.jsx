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
    <div className="flex min-h-full flex-col bg-carne-300">
      <header className="sticky top-0 z-30 border-b border-carne-400/60 bg-carne-300/95 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          {back && (
            <button
              onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
              className="-ml-2 rounded-full p-2 text-cacao-700 hover:bg-carne-400/50 hover:text-cacao-900"
              aria-label="Regresar"
            >
              <BackIcon className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-cacao-900">{title}</h1>
            {subtitle && <p className="truncate text-xs text-cacao-700">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>

      <main className={`mx-auto w-full max-w-lg flex-1 px-4 py-4 ${hideNav ? 'pb-safe' : 'pb-28'}`}>{children}</main>

      {!hideNav && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-crema-300 bg-crema-50/95 pb-safe backdrop-blur">
          <div className="mx-auto grid max-w-lg grid-cols-3">
            {NAV.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                    isActive ? 'text-carne-700' : 'text-cacao-600 hover:text-cacao-800'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-6 w-6 ${isActive ? 'text-carne-700' : ''}`} />
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

import { Navigate, Route, Routes } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import NewQuoteScreen from './screens/NewQuote/index.jsx'
import HistoryScreen from './screens/History.jsx'
import QuoteDetailScreen from './screens/QuoteDetail.jsx'
import SettingsScreen from './screens/Settings.jsx'
import { Button, Spinner } from './components/ui/index.jsx'
import { useSettings } from './state/SettingsContext.jsx'

function Splash() {
  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 bg-carne-300 text-cacao-700">
      <Spinner className="h-8 w-8 text-carne-700" />
      <p className="text-sm">Cargando cotizador…</p>
    </div>
  )
}

/** Aviso cuando hay una versión nueva de la PWA lista para usarse. */
function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })

  if (!needRefresh) return null
  return (
    <div className="fixed inset-x-0 bottom-20 z-40 mx-auto max-w-md px-4">
      <div className="flex items-center gap-3 rounded-xl border border-carne-500/50 bg-crema-50 px-4 py-3 shadow-pop">
        <p className="flex-1 text-sm text-cacao-800">Hay una versión nueva de la app.</p>
        <Button size="sm" onClick={() => updateServiceWorker(true)}>
          Actualizar
        </Button>
        <button className="text-cacao-500" onClick={() => setNeedRefresh(false)} aria-label="Cerrar">
          ✕
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const { ready } = useSettings()
  if (!ready) return <Splash />

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/nueva" replace />} />
        <Route path="/nueva" element={<NewQuoteScreen />} />
        <Route path="/historial" element={<HistoryScreen />} />
        <Route path="/historial/:id" element={<QuoteDetailScreen />} />
        <Route path="/ajustes" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/nueva" replace />} />
      </Routes>
      <UpdatePrompt />
    </>
  )
}

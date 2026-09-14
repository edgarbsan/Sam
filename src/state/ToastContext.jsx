import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)

const TONES = {
  info: 'bg-ink-800 border-ink-700 text-zinc-100',
  success: 'bg-emerald-600/15 border-emerald-500/40 text-emerald-200',
  error: 'bg-red-600/15 border-red-500/40 text-red-200',
  warn: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback(
    (message, { tone = 'info', duration = 3800 } = {}) => {
      const id = ++idRef.current
      setToasts((t) => [...t, { id, message, tone }])
      if (duration > 0) setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      toast,
      success: (m, o) => toast(m, { ...o, tone: 'success' }),
      error: (m, o) => toast(m, { ...o, tone: 'error', duration: 6000 }),
      warn: (m, o) => toast(m, { ...o, tone: 'warn', duration: 5000 }),
      dismiss,
    }),
    [toast, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto w-full max-w-md rounded-xl border px-4 py-3 text-left text-sm shadow-card animate-fade-in ${TONES[t.tone] || TONES.info}`}
          >
            {t.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}

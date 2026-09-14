import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { loadSettings, saveSettings, getApiKey, setApiKey as persistApiKey } from '../lib/db.js'
import { DEFAULT_SETTINGS } from '../lib/constants.js'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [apiKey, setApiKeyState] = useState('')
  const [ready, setReady] = useState(false)
  // Espejo síncrono del estado: evita cierres obsoletos al guardar en cadena.
  const settingsRef = useRef(DEFAULT_SETTINGS)

  useEffect(() => {
    let alive = true
    loadSettings().then((s) => {
      if (!alive) return
      settingsRef.current = s
      setSettings(s)
      setApiKeyState(getApiKey())
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const updateSettings = useCallback(async (patch) => {
    const base = settingsRef.current
    const next = typeof patch === 'function' ? patch(base) : { ...base, ...patch }
    settingsRef.current = next
    setSettings(next)
    return saveSettings(next)
  }, [])

  const updateApiKey = useCallback((key) => {
    persistApiKey(key)
    setApiKeyState(key ? key.trim() : '')
  }, [])

  const value = useMemo(
    () => ({ settings, updateSettings, apiKey, updateApiKey, ready, hasApiKey: Boolean(apiKey) }),
    [settings, updateSettings, apiKey, updateApiKey, ready],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings debe usarse dentro de SettingsProvider')
  return ctx
}

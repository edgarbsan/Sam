import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSuggestions, fetchPlaceDetails, createSessionToken } from '../lib/maps.js'
import { useSettings } from '../state/SettingsContext.jsx'
import { Spinner } from './ui/index.jsx'

/**
 * Campo de dirección con autocompletado de Google Places.
 * Si Places falla o no hay API Key, permite capturar la dirección a mano:
 * Directions también acepta texto libre.
 */
export default function PlaceAutocomplete({ label, icon, value, onChange, placeholder, required, autoFocus }) {
  const { apiKey } = useSettings()
  const [query, setQuery] = useState(value?.description || '')
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const tokenRef = useRef(null)
  const boxRef = useRef(null)
  const debounceRef = useRef(null)
  const skipNextSearch = useRef(false)
  const pickingRef = useRef(false)

  useEffect(() => {
    setQuery(value?.description || '')
  }, [value?.description])

  useEffect(() => {
    if (!apiKey) return
    createSessionToken(apiKey).then((t) => {
      tokenRef.current = t
    })
  }, [apiKey])

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('touchstart', onClickOutside)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('touchstart', onClickOutside)
    }
  }, [])

  const search = useCallback(
    async (text) => {
      // Sin API Key no hay sugerencias: el aviso general ya lo explica en el paso 1.
      if (!apiKey) return
      setLoading(true)
      setError('')
      try {
        const results = await fetchSuggestions(apiKey, text, tokenRef.current)
        setItems(results)
        setOpen(true)
      } catch (err) {
        setItems([])
        setError(err?.message || 'No se pudieron obtener sugerencias.')
      } finally {
        setLoading(false)
      }
    },
    [apiKey],
  )

  const handleInput = (text) => {
    setQuery(text)
    if (value && text !== value.description) onChange(null)
    clearTimeout(debounceRef.current)
    if (skipNextSearch.current) {
      skipNextSearch.current = false
      return
    }
    if (text.trim().length < 3) {
      setItems([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      // Se toma la dirección tal cual mientras tanto: así el usuario puede
      // continuar aunque no elija (o no existan) sugerencias.
      commitFreeText(text)
      search(text)
    }, 350)
  }

  const pick = async (item) => {
    skipNextSearch.current = true
    pickingRef.current = true
    setQuery(item.description)
    setOpen(false)
    setItems([])
    setLoading(true)
    try {
      const details = await fetchPlaceDetails(apiKey, item.placeId, tokenRef.current)
      onChange({
        placeId: item.placeId,
        description: details?.description || item.description,
        shortName: details?.shortName || item.primary,
        lat: details?.lat,
        lng: details?.lng,
      })
      tokenRef.current = await createSessionToken(apiKey) // el token se consume al elegir
    } catch {
      onChange({ placeId: item.placeId, description: item.description, shortName: item.primary })
    } finally {
      setLoading(false)
      pickingRef.current = false
    }
  }

  const commitFreeText = (raw) => {
    // Si el usuario tocó una sugerencia, esa selección manda.
    if (pickingRef.current) return
    const text = String(raw ?? query).trim()
    if (!text) return
    onChange({ description: text, shortName: text.split(',')[0].trim(), manual: true })
  }

  return (
    <div ref={boxRef} className="relative">
      {label && (
        <label className="label-base">
          {label}
          {required && <span className="text-brand-400"> *</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && <span className="pointer-events-none absolute left-3.5 text-zinc-500">{icon}</span>}
        <input
          className={`input-base ${icon ? 'pl-11' : ''} pr-10`}
          value={query}
          autoFocus={autoFocus}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => {
            if (items.length) setOpen(true)
          }}
          onBlur={() => {
            setOpen(false)
            // Direcciones muy cortas (no buscadas) también se respetan.
            if (!value && query.trim()) setTimeout(() => commitFreeText(query), 200)
          }}
        />
        <span className="absolute right-3 flex items-center">
          {loading ? (
            <Spinner className="h-4 w-4 text-zinc-400" />
          ) : query ? (
            <button
              type="button"
              aria-label="Limpiar"
              className="rounded-full p-1 text-zinc-500 hover:bg-ink-700 hover:text-zinc-200"
              onClick={() => {
                setQuery('')
                setItems([])
                onChange(null)
              }}
            >
              ✕
            </button>
          ) : null}
        </span>
      </div>

      {/* Espacio reservado: si el texto apareciera y desapareciera, los botones
          de abajo se moverían justo cuando el usuario los va a tocar. */}
      <div className="mt-1.5 min-h-[18px]">
        {error ? (
          <p className="text-xs text-amber-400">{error}</p>
        ) : value?.manual ? (
          <p className="text-xs text-zinc-500">Dirección capturada a mano: Google la interpretará al calcular la ruta.</p>
        ) : null}
      </div>

      {open && items.length > 0 && (
        <ul className="absolute z-40 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-ink-700 bg-ink-850 shadow-card">
          {items.map((item) => (
            <li key={item.placeId}>
              <button
                type="button"
                className="w-full border-b border-ink-800 px-4 py-3 text-left last:border-0 hover:bg-ink-800 active:bg-ink-700"
                onMouseDown={(e) => {
                  e.preventDefault()
                  pickingRef.current = true
                }}
                onTouchStart={() => {
                  pickingRef.current = true
                }}
                onClick={() => pick(item)}
              >
                <p className="text-[15px] font-medium text-zinc-100">{item.primary}</p>
                {item.secondary && <p className="text-xs text-zinc-500">{item.secondary}</p>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

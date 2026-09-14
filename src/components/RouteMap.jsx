import { useEffect, useRef, useState } from 'react'
import { loadMaps } from '../lib/maps.js'
import { useSettings } from '../state/SettingsContext.jsx'
import { Skeleton } from './ui/index.jsx'

const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d21' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d21' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9a9aa4' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3d3d45' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c32' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d3d45' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#c8c8d0' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1720' }] },
]

/** Mapa interactivo con la ruta trazada. Si Maps no carga, muestra el croquis. */
export default function RouteMap({ path, fallbackImage, className = 'h-56', interactive = true }) {
  const { apiKey } = useSettings()
  const ref = useRef(null)
  const mapRef = useRef(null)
  const overlaysRef = useRef([])
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!apiKey || !path?.length) {
      setLoading(false)
      setFailed(true)
      return undefined
    }

    loadMaps(apiKey)
      .then((google) => {
        if (cancelled || !ref.current) return
        const bounds = new google.maps.LatLngBounds()
        path.forEach((p) => bounds.extend(new google.maps.LatLng(p.lat, p.lng)))

        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(ref.current, {
            disableDefaultUI: true,
            zoomControl: interactive,
            gestureHandling: interactive ? 'greedy' : 'none',
            styles: DARK_STYLE,
            backgroundColor: '#111114',
          })
        }
        overlaysRef.current.forEach((o) => o.setMap(null))
        overlaysRef.current = []

        const line = new google.maps.Polyline({
          path,
          strokeColor: '#ff8112',
          strokeOpacity: 0.95,
          strokeWeight: 5,
          map: mapRef.current,
        })
        const dot = (position, color, label) =>
          new google.maps.Marker({
            position,
            map: mapRef.current,
            label: { text: label, color: '#0a0a0b', fontWeight: '700', fontSize: '12px' },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: '#0a0a0b',
              strokeWeight: 2,
            },
          })
        overlaysRef.current = [line, dot(path[0], '#22c55e', 'A'), dot(path[path.length - 1], '#ff8112', 'B')]
        mapRef.current.fitBounds(bounds, 32)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setFailed(true)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [apiKey, path, interactive])

  if (failed) {
    return fallbackImage ? (
      <img src={fallbackImage} alt="Croquis de la ruta" className={`w-full rounded-2xl border border-ink-800 object-cover ${className}`} />
    ) : (
      <div className={`flex items-center justify-center rounded-2xl border border-dashed border-ink-700 text-sm text-zinc-500 ${className}`}>
        Mapa no disponible sin conexión
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-ink-800 ${className}`}>
      <div ref={ref} className="h-full w-full" />
      {loading && <Skeleton className="absolute inset-0 rounded-2xl" />}
    </div>
  )
}

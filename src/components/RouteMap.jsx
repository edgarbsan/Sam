import { useEffect, useRef, useState } from 'react'
import { loadMaps } from '../lib/maps.js'
import { useSettings } from '../state/SettingsContext.jsx'
import { Skeleton } from './ui/index.jsx'

// Mapa en tonos cálidos para que combine con el color de marca.
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#fdf4ee' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#fffcfa' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6d4e3b' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#dfc0ab' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#f7e7dc' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#efd8c9' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f9d8c4' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e89a6d' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#543a2b' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfe3ea' }] },
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
            styles: MAP_STYLE,
            backgroundColor: '#fdf4ee',
          })
        }
        overlaysRef.current.forEach((o) => o.setMap(null))
        overlaysRef.current = []

        // Dos trazos: uno blanco debajo para que la ruta se lea sobre el mapa claro.
        const halo = new google.maps.Polyline({
          path,
          strokeColor: '#ffffff',
          strokeOpacity: 0.9,
          strokeWeight: 9,
          map: mapRef.current,
        })
        const line = new google.maps.Polyline({
          path,
          strokeColor: '#9e4f24',
          strokeOpacity: 1,
          strokeWeight: 5,
          map: mapRef.current,
        })
        const dot = (position, color, label) =>
          new google.maps.Marker({
            position,
            map: mapRef.current,
            label: { text: label, color: '#ffffff', fontWeight: '700', fontSize: '12px' },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2.5,
            },
          })
        overlaysRef.current = [halo, line, dot(path[0], '#15803d', 'A'), dot(path[path.length - 1], '#9e4f24', 'B')]
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
      <img src={fallbackImage} alt="Croquis de la ruta" className={`w-full rounded-2xl border border-crema-300 object-cover ${className}`} />
    ) : (
      <div className={`flex items-center justify-center rounded-2xl border border-dashed border-crema-400 text-sm text-cacao-500 ${className}`}>
        Mapa no disponible sin conexión
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-crema-300 ${className}`}>
      <div ref={ref} className="h-full w-full" />
      {loading && <Skeleton className="absolute inset-0 rounded-2xl" />}
    </div>
  )
}

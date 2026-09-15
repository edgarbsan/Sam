// Integración con Google Maps Platform:
//  - Carga del SDK de JavaScript (Places + Geometry) con la key del usuario.
//  - Autocompletado de lugares (API nueva con respaldo a la heredada).
//  - Rutas: Routes API v2 (incluye casetas) con respaldo a Directions del SDK.
import { decodePolyline, simplifyPath, encodePolyline } from './polyline.js'
import { estimateTollsByKm, round2 } from './calc.js'

export class MapsError extends Error {
  constructor(message, code = 'maps_error') {
    super(message)
    this.name = 'MapsError'
    this.code = code
  }
}

const CALLBACK = '__cotizadorMapsReady'
let loadPromise = null
let loadedWithKey = null
export let authFailed = false

/* ------------------------------ Carga SDK ------------------------------ */

export function isMapsLoaded() {
  return typeof window !== 'undefined' && !!window.google?.maps
}

export function loadMaps(apiKey) {
  if (!apiKey) return Promise.reject(new MapsError('Falta la API Key de Google Maps. Configúrala en Ajustes.', 'no_key'))
  if (isMapsLoaded() && loadedWithKey === apiKey) return Promise.resolve(window.google)
  if (loadPromise && loadedWithKey === apiKey) return loadPromise

  loadedWithKey = apiKey
  authFailed = false
  loadPromise = new Promise((resolve, reject) => {
    const fail = (msg, code) => {
      loadPromise = null
      loadedWithKey = null
      reject(new MapsError(msg, code))
    }
    const timer = setTimeout(
      () => fail('Google Maps tardó demasiado en responder. Revisa tu conexión.', 'timeout'),
      20000,
    )

    // Google avisa por aquí cuando la key es inválida o no tiene permisos.
    window.gm_authFailure = () => {
      authFailed = true
      clearTimeout(timer)
      fail('La API Key fue rechazada por Google. Revisa que sea válida y que tenga habilitadas Maps JavaScript, Places y Directions.', 'auth')
    }

    window[CALLBACK] = () => {
      clearTimeout(timer)
      resolve(window.google)
    }

    const existing = document.getElementById('gmaps-sdk')
    if (existing) existing.remove()

    const script = document.createElement('script')
    script.id = 'gmaps-sdk'
    script.async = true
    script.src =
      'https://maps.googleapis.com/maps/api/js' +
      `?key=${encodeURIComponent(apiKey)}` +
      '&libraries=places,geometry&language=es-419&region=MX&loading=async' +
      `&callback=${CALLBACK}`
    script.onerror = () => {
      clearTimeout(timer)
      fail('No se pudo cargar Google Maps. Revisa tu conexión a internet.', 'network')
    }
    document.head.appendChild(script)
  })
  return loadPromise
}

async function importPlaces(google) {
  try {
    if (google.maps.importLibrary) return await google.maps.importLibrary('places')
  } catch {
    /* seguimos con el namespace clásico */
  }
  return google.maps.places
}

/* --------------------------- Autocompletado ---------------------------- */

export async function createSessionToken(apiKey) {
  try {
    const google = await loadMaps(apiKey)
    const places = await importPlaces(google)
    const Token = places?.AutocompleteSessionToken || google.maps.places?.AutocompleteSessionToken
    return Token ? new Token() : null
  } catch {
    return null
  }
}

/** Devuelve [{placeId, primary, secondary, description}] */
export async function fetchSuggestions(apiKey, input, sessionToken) {
  const text = String(input || '').trim()
  if (text.length < 3) return []
  const google = await loadMaps(apiKey)
  const places = await importPlaces(google)

  // API nueva (Places API New)
  if (places?.AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
    try {
      const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: text,
        sessionToken: sessionToken || undefined,
        includedRegionCodes: ['mx'],
        language: 'es-419',
        region: 'mx',
      })
      return (suggestions || [])
        .filter((s) => s.placePrediction)
        .map((s) => {
          const p = s.placePrediction
          const full = p.text?.toString?.() || ''
          return {
            placeId: p.placeId,
            primary: p.mainText?.toString?.() || full,
            secondary: p.secondaryText?.toString?.() || '',
            description: full || [p.mainText?.toString?.(), p.secondaryText?.toString?.()].filter(Boolean).join(', '),
          }
        })
    } catch (err) {
      if (String(err?.message || '').includes('ApiTargetBlockedMapError')) throw new MapsError('La API Key no tiene habilitada Places API.', 'places_blocked')
      /* si la API nueva no está habilitada, probamos la heredada */
    }
  }

  // API heredada
  const Service = google.maps.places?.AutocompleteService
  if (!Service) throw new MapsError('Places API no está disponible con esta API Key.', 'places_blocked')
  const service = new Service()
  return new Promise((resolve, reject) => {
    service.getPlacePredictions(
      {
        input: text,
        componentRestrictions: { country: 'mx' },
        sessionToken: sessionToken || undefined,
        language: 'es-419',
      },
      (predictions, status) => {
        const S = google.maps.places.PlacesServiceStatus
        if (status === S.OK && predictions) {
          resolve(
            predictions.map((p) => ({
              placeId: p.place_id,
              primary: p.structured_formatting?.main_text || p.description,
              secondary: p.structured_formatting?.secondary_text || '',
              description: p.description,
            })),
          )
        } else if (status === S.ZERO_RESULTS) {
          resolve([])
        } else {
          reject(new MapsError(`No se pudieron obtener sugerencias (${status}).`, 'places_error'))
        }
      },
    )
  })
}

/** Completa lat/lng y dirección formateada de un place_id. */
export async function fetchPlaceDetails(apiKey, placeId, sessionToken) {
  if (!placeId) return null
  const google = await loadMaps(apiKey)
  const places = await importPlaces(google)

  if (places?.Place) {
    try {
      const place = new places.Place({ id: placeId, requestedLanguage: 'es-419', requestedRegion: 'mx' })
      await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] })
      const loc = place.location
      return {
        placeId,
        description: place.formattedAddress || place.displayName || '',
        shortName: place.displayName || '',
        lat: typeof loc?.lat === 'function' ? loc.lat() : loc?.lat,
        lng: typeof loc?.lng === 'function' ? loc.lng() : loc?.lng,
      }
    } catch {
      /* respaldo abajo */
    }
  }

  const Service = google.maps.places?.PlacesService
  if (!Service) return { placeId }
  const service = new Service(document.createElement('div'))
  return new Promise((resolve) => {
    service.getDetails(
      { placeId, fields: ['geometry', 'formatted_address', 'name'], sessionToken: sessionToken || undefined },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return resolve({ placeId })
        resolve({
          placeId,
          description: place.formatted_address || place.name || '',
          shortName: place.name || '',
          lat: place.geometry?.location?.lat?.(),
          lng: place.geometry?.location?.lng?.(),
        })
      },
    )
  })
}

/* ------------------------------- Rutas --------------------------------- */

function waypointFor(place) {
  if (!place) return null
  if (place.placeId) return { placeId: place.placeId }
  if (Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    return { location: { latLng: { latitude: place.lat, longitude: place.lng } } }
  }
  if (place.description) return { address: place.description }
  return null
}

function jsWaypointFor(google, place) {
  if (!place) return null
  if (place.placeId) return { placeId: place.placeId }
  if (Number.isFinite(place.lat) && Number.isFinite(place.lng)) return new google.maps.LatLng(place.lat, place.lng)
  return place.description || null
}

function moneyFromProto(price) {
  if (!price) return null
  const units = Number(price.units || 0)
  const nanos = Number(price.nanos || 0)
  return round2(units + nanos / 1e9)
}

function tollFromAdvisory(advisory) {
  const list = advisory?.tollInfo?.estimatedPrice
  if (!Array.isArray(list) || !list.length) return null
  const mxn = list.find((p) => p.currencyCode === 'MXN') || list[0]
  return moneyFromProto(mxn)
}

/**
 * Routes API v2 (REST). Es la única que devuelve el costo de casetas,
 * considerando TAG/IAVE. Requiere que la key tenga habilitada "Routes API".
 */
export async function computeRoutesRest({
  apiKey,
  origin,
  destination,
  departureTime,
  avoidTolls = false,
  alternatives = true,
  signal,
}) {
  const originWp = waypointFor(origin)
  const destinationWp = waypointFor(destination)
  if (!originWp || !destinationWp) throw new MapsError('Falta origen o destino.', 'bad_input')

  const body = {
    origin: originWp,
    destination: destinationWp,
    travelMode: 'DRIVE',
    computeAlternativeRoutes: alternatives,
    extraComputations: avoidTolls ? [] : ['TOLLS'],
    routeModifiers: {
      avoidTolls,
      vehicleInfo: { emissionType: 'DIESEL' },
      // Pases de peaje mexicanos: el precio se devuelve con tarifa de TAG.
      ...(avoidTolls ? {} : { tollPasses: ['MX_TAG_IAVE', 'MX_PASE', 'MX_VIAPASS'] }),
    },
    languageCode: 'es-MX',
    regionCode: 'MX',
    units: 'METRIC',
  }
  if (departureTime && departureTime.getTime() > Date.now() + 60000) {
    body.departureTime = departureTime.toISOString()
    body.routingPreference = 'TRAFFIC_AWARE'
  } else {
    body.routingPreference = 'TRAFFIC_UNAWARE'
  }

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'routes.distanceMeters',
        'routes.duration',
        'routes.description',
        'routes.polyline.encodedPolyline',
        'routes.travelAdvisory.tollInfo',
        'routes.legs.travelAdvisory.tollInfo',
      ].join(','),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const err = await res.json()
      detail = err?.error?.message || ''
    } catch {
      /* sin cuerpo útil */
    }
    throw new MapsError(detail || `Routes API respondió ${res.status}.`, res.status === 403 ? 'routes_forbidden' : 'routes_error')
  }

  const data = await res.json()
  const routes = data?.routes || []
  if (!routes.length) throw new MapsError('Google no encontró una ruta entre esos puntos.', 'no_route')

  return routes.map((r, i) => {
    const seconds = Number(String(r.duration || '0s').replace('s', '')) || 0
    const legToll = (r.legs || []).reduce((sum, leg) => {
      const t = tollFromAdvisory(leg.travelAdvisory)
      return t == null ? sum : sum + t
    }, 0)
    const routeToll = tollFromAdvisory(r.travelAdvisory)
    const toll = routeToll != null ? routeToll : legToll > 0 ? round2(legToll) : null
    return {
      id: `rest-${avoidTolls ? 'free' : 'toll'}-${i}`,
      source: 'routes-api',
      summary: r.description || (avoidTolls ? 'Ruta libre (sin casetas)' : `Ruta ${i + 1}`),
      distanceKm: round2((r.distanceMeters || 0) / 1000),
      durationMin: Math.round(seconds / 60),
      polyline: r.polyline?.encodedPolyline || '',
      rawToll: avoidTolls ? 0 : toll,
      avoidTolls,
    }
  })
}

/** Respaldo: Directions del SDK de JavaScript (sin datos de casetas). */
export async function computeRoutesJs({ apiKey, origin, destination, departureTime, avoidTolls = false }) {
  const google = await loadMaps(apiKey)
  const service = new google.maps.DirectionsService()
  const request = {
    origin: jsWaypointFor(google, origin),
    destination: jsWaypointFor(google, destination),
    travelMode: google.maps.TravelMode.DRIVING,
    provideRouteAlternatives: true,
    avoidTolls,
    region: 'MX',
    language: 'es-419',
    unitSystem: google.maps.UnitSystem.METRIC,
  }
  if (departureTime && departureTime.getTime() > Date.now() + 60000) {
    request.drivingOptions = { departureTime, trafficModel: google.maps.TrafficModel.BEST_GUESS }
  }

  const result = await new Promise((resolve, reject) => {
    service.route(request, (res, status) => {
      if (status === google.maps.DirectionsStatus.OK) resolve(res)
      else if (status === google.maps.DirectionsStatus.ZERO_RESULTS)
        reject(new MapsError('Google no encontró una ruta entre esos puntos.', 'no_route'))
      else reject(new MapsError(`Directions respondió ${status}.`, 'directions_error'))
    })
  })

  return (result.routes || []).map((r, i) => {
    const leg = (r.legs || []).reduce(
      (acc, l) => ({
        meters: acc.meters + (l.distance?.value || 0),
        seconds: acc.seconds + (l.duration_in_traffic?.value || l.duration?.value || 0),
      }),
      { meters: 0, seconds: 0 },
    )
    return {
      id: `js-${avoidTolls ? 'free' : 'toll'}-${i}`,
      source: 'directions-js',
      summary: r.summary || (avoidTolls ? 'Ruta libre (sin casetas)' : `Ruta ${i + 1}`),
      distanceKm: round2(leg.meters / 1000),
      durationMin: Math.round(leg.seconds / 60),
      polyline: typeof r.overview_polyline === 'string' ? r.overview_polyline : r.overview_polyline?.points || '',
      path: (r.overview_path || []).map((p) => ({ lat: p.lat(), lng: p.lng() })),
      rawToll: avoidTolls ? 0 : null,
      avoidTolls,
    }
  })
}

/**
 * Obtiene todas las rutas candidatas y normaliza el costo de casetas.
 * Devuelve { candidates, tollSource, warnings }.
 */
export async function getRouteCandidates({ apiKey, origin, destination, departureTime, preference, settings, signal }) {
  if (!apiKey) throw new MapsError('Falta la API Key de Google Maps. Configúrala en Ajustes.', 'no_key')
  const warnings = []
  const multiplier = Number(settings?.tollAxleMultiplier) > 0 ? Number(settings.tollAxleMultiplier) : 1
  const perKm = Number(settings?.tollPerKmFallback) || 0

  let raw = []
  let tollSource = 'routes-api'

  try {
    const jobs = [computeRoutesRest({ apiKey, origin, destination, departureTime, alternatives: true, signal })]
    if (preference === 'economica') {
      jobs.push(
        computeRoutesRest({ apiKey, origin, destination, departureTime, avoidTolls: true, alternatives: false, signal })
          .catch(() => []),
      )
    }
    const results = await Promise.all(jobs)
    raw = results.flat()
  } catch (restError) {
    // Respaldo con el SDK: seguimos cotizando, con casetas estimadas por km.
    tollSource = 'estimado'
    warnings.push(
      restError.code === 'routes_forbidden'
        ? 'Routes API no está habilitada para tu API Key: las casetas se estiman por kilómetro.'
        : 'No se pudo consultar el costo real de casetas; se estima por kilómetro.',
    )
    const jobs = [computeRoutesJs({ apiKey, origin, destination, departureTime })]
    if (preference === 'economica') {
      jobs.push(computeRoutesJs({ apiKey, origin, destination, departureTime, avoidTolls: true }).catch(() => []))
    }
    const results = await Promise.all(jobs)
    raw = results.flat()
    if (!raw.length) throw restError
  }

  // Elimina duplicados por distancia+tiempo (las llamadas pueden traslaparse).
  const seen = new Set()
  const candidates = []
  for (const r of raw) {
    const key = `${Math.round(r.distanceKm)}|${Math.round(r.durationMin / 5)}`
    if (seen.has(key)) continue
    seen.add(key)
    let tolls
    let tollKind
    if (r.avoidTolls) {
      tolls = 0
      tollKind = 'sin casetas'
    } else if (r.rawToll != null && r.rawToll > 0) {
      tolls = round2(r.rawToll * multiplier)
      tollKind = 'Google (TAG) × ejes'
    } else {
      tolls = estimateTollsByKm(r.distanceKm, perKm)
      tollKind = 'estimado por km'
      if (tollSource === 'routes-api') tollSource = 'mixto'
    }
    candidates.push({ ...r, tolls, tollKind, path: r.path || decodePolyline(r.polyline) })
  }

  if (!candidates.length) throw new MapsError('Google no encontró una ruta entre esos puntos.', 'no_route')
  if (tollSource === 'mixto') {
    warnings.push('Google no reportó casetas para alguna alternativa; ahí se estimaron por kilómetro.')
  }
  return { candidates, tollSource, warnings }
}

/* --------------------------- Mapa e imágenes --------------------------- */

export function buildStaticMapUrl({ apiKey, path, origin, destination, size = '640x320', scale = 2 }) {
  if (!apiKey) return null
  const pts = simplifyPath(path || [], 80)
  const params = new URLSearchParams()
  params.set('size', size)
  params.set('scale', String(scale))
  params.set('maptype', 'roadmap')
  params.set('language', 'es-419')
  params.set('region', 'MX')
  params.set('key', apiKey)
  const qs = []
  if (pts.length > 1) qs.push(`path=color:0x9e4f24ff|weight:5|enc:${encodePolyline(pts)}`)
  const first = pts[0]
  const last = pts[pts.length - 1]
  if (first) qs.push(`markers=color:0x15803d|label:A|${first.lat.toFixed(5)},${first.lng.toFixed(5)}`)
  else if (Number.isFinite(origin?.lat)) qs.push(`markers=color:0x15803d|label:A|${origin.lat},${origin.lng}`)
  if (last) qs.push(`markers=color:0x9e4f24|label:B|${last.lat.toFixed(5)},${last.lng.toFixed(5)}`)
  else if (Number.isFinite(destination?.lat)) qs.push(`markers=color:0x9e4f24|label:B|${destination.lat},${destination.lng}`)
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}&${qs.join('&')}`
}

/** Liga de Google Maps con la ruta, para compartir por WhatsApp. */
export function buildDirectionsLink({ origin, destination, avoidTolls = false }) {
  const params = new URLSearchParams({ api: '1', travelmode: 'driving' })
  params.set('origin', origin?.description || `${origin?.lat},${origin?.lng}`)
  if (origin?.placeId) params.set('origin_place_id', origin.placeId)
  params.set('destination', destination?.description || `${destination?.lat},${destination?.lng}`)
  if (destination?.placeId) params.set('destination_place_id', destination.placeId)
  if (avoidTolls) params.set('avoid', 'tolls')
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

// Decodificador de polilíneas codificadas de Google (algoritmo estándar).
// Propio, para poder dibujar la ruta sin depender del SDK ni de internet.

export function decodePolyline(encoded, precision = 5) {
  if (!encoded || typeof encoded !== 'string') return []
  const factor = 10 ** precision
  const points = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let result = 1
    let shift = 0
    let b
    do {
      b = encoded.charCodeAt(index++) - 63 - 1
      result += b << shift
      shift += 5
    } while (b >= 0x1f)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    result = 1
    shift = 0
    do {
      b = encoded.charCodeAt(index++) - 63 - 1
      result += b << shift
      shift += 5
    } while (b >= 0x1f)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    points.push({ lat: lat / factor, lng: lng / factor })
  }
  return points
}

/** Reduce la cantidad de puntos conservando la forma (para URLs cortas). */
export function simplifyPath(points, maxPoints = 90) {
  if (!Array.isArray(points) || points.length <= maxPoints) return points || []
  const step = (points.length - 1) / (maxPoints - 1)
  const out = []
  for (let i = 0; i < maxPoints - 1; i++) out.push(points[Math.round(i * step)])
  out.push(points[points.length - 1])
  return out
}

export function boundsOf(points) {
  if (!points?.length) return null
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  return { minLat, maxLat, minLng, maxLng }
}

/** Codifica de vuelta a polilínea (para el parámetro path del Static Maps API). */
export function encodePolyline(points, precision = 5) {
  const factor = 10 ** precision
  let lastLat = 0
  let lastLng = 0
  let out = ''
  const encodeValue = (value) => {
    let v = value < 0 ? ~(value << 1) : value << 1
    let chunk = ''
    while (v >= 0x20) {
      chunk += String.fromCharCode((0x20 | (v & 0x1f)) + 63)
      v >>= 5
    }
    chunk += String.fromCharCode(v + 63)
    return chunk
  }
  for (const p of points || []) {
    const lat = Math.round(p.lat * factor)
    const lng = Math.round(p.lng * factor)
    out += encodeValue(lat - lastLat)
    out += encodeValue(lng - lastLng)
    lastLat = lat
    lastLng = lng
  }
  return out
}

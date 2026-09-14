// Imagen del mapa que se embebe en la cotización (PDF y vista previa).
// 1) Intenta el Static Maps API. 2) Si el navegador lo bloquea, dibuja un
//    croquis de la ruta en canvas a partir de la polilínea (funciona offline).
import { simplifyPath, boundsOf } from './polyline.js'
import { buildStaticMapUrl } from './maps.js'

const BG = '#111114'
const GRID = '#1f1f24'
const ROUTE = '#ff8112'
const START = '#22c55e'
const TEXT = '#e7e7ea'
const MUTED = '#9a9aa4'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen del mapa'))
    img.src = src
    setTimeout(() => reject(new Error('timeout')), 12000)
  })
}

/** Croquis propio de la ruta: sin mosaicos, sin CORS, sin internet. */
export function drawRouteSketch({ path, width = 900, height = 450, origin, destination, distanceLabel, durationLabel }) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = GRID
  ctx.lineWidth = 1
  for (let x = 0; x < width; x += 45) {
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, height)
    ctx.stroke()
  }
  for (let y = 0; y < height; y += 45) {
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(width, y + 0.5)
    ctx.stroke()
  }

  const pts = simplifyPath(path || [], 400)
  const pad = { top: 34, right: 28, bottom: 62, left: 28 }
  const b = boundsOf(pts)

  if (b && pts.length > 1) {
    const midLat = (b.minLat + b.maxLat) / 2
    const kx = Math.cos((midLat * Math.PI) / 180) || 1
    const spanX = Math.max((b.maxLng - b.minLng) * kx, 1e-6)
    const spanY = Math.max(b.maxLat - b.minLat, 1e-6)
    const innerW = width - pad.left - pad.right
    const innerH = height - pad.top - pad.bottom
    const scale = Math.min(innerW / spanX, innerH / spanY)
    const offsetX = pad.left + (innerW - spanX * scale) / 2
    const offsetY = pad.top + (innerH - spanY * scale) / 2
    const project = (p) => ({
      x: offsetX + (p.lng - b.minLng) * kx * scale,
      y: offsetY + (b.maxLat - p.lat) * scale,
    })

    // Sombra suave bajo la ruta
    ctx.strokeStyle = 'rgba(255,129,18,.18)'
    ctx.lineWidth = 14
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    pts.forEach((p, i) => {
      const { x, y } = project(p)
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
    })
    ctx.stroke()

    ctx.strokeStyle = ROUTE
    ctx.lineWidth = 5
    ctx.stroke()

    const a = project(pts[0])
    const z = project(pts[pts.length - 1])
    const marker = (p, color, label) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = BG
      ctx.stroke()
      ctx.fillStyle = '#0a0a0b'
      ctx.font = 'bold 13px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, p.x, p.y + 0.5)
    }
    marker(a, START, 'A')
    marker(z, ROUTE, 'B')
  } else {
    ctx.fillStyle = MUTED
    ctx.font = '16px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Ruta no disponible', width / 2, height / 2)
  }

  // Cintillo inferior con origen → destino
  ctx.fillStyle = 'rgba(10,10,11,.86)'
  ctx.fillRect(0, height - 52, width, 52)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = TEXT
  ctx.font = 'bold 16px system-ui, sans-serif'
  const trim = (s, max) => (s && s.length > max ? `${s.slice(0, max - 1)}…` : s || '—')
  ctx.fillText(`${trim(origin, 34)}  →  ${trim(destination, 34)}`, 18, height - 32)
  ctx.fillStyle = MUTED
  ctx.font = '14px system-ui, sans-serif'
  ctx.fillText([distanceLabel, durationLabel].filter(Boolean).join('  ·  '), 18, height - 13)

  return canvas.toDataURL('image/jpeg', 0.86)
}

async function staticMapDataUrl({ apiKey, path, origin, destination }) {
  const url = buildStaticMapUrl({ apiKey, path, origin, destination, size: '640x320', scale: 2 })
  if (!url) throw new Error('sin api key')
  const img = await loadImage(url)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || 1280
  canvas.height = img.naturalHeight || 640
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.86) // lanza SecurityError si quedó "tainted"
}

/**
 * Devuelve { dataUrl, source: 'static' | 'sketch' } para guardar en IndexedDB.
 * Nunca lanza: si todo falla devuelve el croquis.
 */
export async function captureRouteImage({ apiKey, path, origin, destination, distanceLabel, durationLabel }) {
  try {
    const dataUrl = await staticMapDataUrl({ apiKey, path, origin, destination })
    return { dataUrl, source: 'static' }
  } catch {
    try {
      const dataUrl = drawRouteSketch({
        path,
        origin: origin?.shortName || origin?.description,
        destination: destination?.shortName || destination?.description,
        distanceLabel,
        durationLabel,
      })
      return { dataUrl, source: 'sketch' }
    } catch {
      return { dataUrl: null, source: 'none' }
    }
  }
}

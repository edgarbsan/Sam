// Precio del diésel desde datos abiertos de la CRE (datos.gob.mx).
// Si el navegador bloquea la consulta (CORS) o el servicio no responde,
// la app conserva el último precio guardado y lo marca como desactualizado.
import { DIESEL_STALE_DAYS } from './constants.js'
import { daysSince } from './format.js'
import { round2 } from './calc.js'

export class DieselError extends Error {
  constructor(message, code = 'diesel_error') {
    super(message)
    this.name = 'DieselError'
    this.code = code
  }
}

export const CRE_DATASET_URL = 'https://datos.gob.mx/busca/dataset/precios-de-gasolina-y-diesel'

const SOURCES = [
  {
    id: 'api-datos-gob',
    label: 'API datos.gob.mx',
    url: 'https://api.datos.gob.mx/v1/precio.gasolina.publicos?pageSize=500',
    parse: async (res) => {
      const json = await res.json()
      return (json?.results || []).map((r) => Number(r.diesel)).filter((n) => Number.isFinite(n) && n > 5 && n < 100)
    },
  },
  {
    id: 'publicacion-externa',
    label: 'Publicación externa CRE',
    url: 'https://publicacionexterna.azurewebsites.net/publicaciones/prices',
    parse: async (res) => {
      const text = await res.text()
      const doc = new DOMParser().parseFromString(text, 'application/xml')
      if (doc.querySelector('parsererror')) throw new DieselError('Respuesta XML inválida de la CRE.', 'parse')
      const prices = []
      doc.querySelectorAll('gas_price').forEach((node) => {
        if ((node.getAttribute('type') || '').toLowerCase() !== 'diesel') return
        const n = Number(String(node.textContent || '').trim())
        if (Number.isFinite(n) && n > 5 && n < 100) prices.push(n)
      })
      return prices
    },
  },
]

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

async function tryFetch(url, { timeout = 12000, proxy = '' } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const target = proxy ? `${proxy}${proxy.includes('?') ? '' : ''}${encodeURIComponent(url)}` : url
    const res = await fetch(target, { signal: controller.signal, headers: { Accept: 'application/json, text/xml, */*' } })
    if (!res.ok) throw new DieselError(`El servicio respondió ${res.status}.`, 'http')
    return res
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Consulta el precio nacional del diésel (mediana de las estaciones publicadas).
 * @returns {Promise<{price:number, date:string, source:string, sampleSize:number}>}
 */
export async function fetchDieselPrice({ corsProxy = '' } = {}) {
  const errors = []
  for (const source of SOURCES) {
    try {
      const res = await tryFetch(source.url, { proxy: corsProxy })
      const prices = await source.parse(res)
      if (!prices.length) throw new DieselError('El servicio no devolvió precios de diésel.', 'empty')
      return {
        price: round2(median(prices)),
        date: new Date().toISOString(),
        source: source.label,
        sampleSize: prices.length,
      }
    } catch (err) {
      errors.push(`${source.label}: ${err.message}`)
    }
  }
  throw new DieselError(
    'No se pudo consultar el precio del diésel de la CRE. Captúralo manualmente. ' +
      '(Si el navegador bloquea la consulta por CORS puedes configurar un proxy en Ajustes.)',
    'unavailable',
  )
}

export function isDieselStale(dateISO) {
  return daysSince(dateISO) > DIESEL_STALE_DAYS
}

export function dieselSourceLabel(settings) {
  if (!settings) return ''
  if (settings.dieselPriceSource === 'cre') return 'CRE / datos.gob.mx'
  if (settings.dieselPriceSource === 'manual') return 'Capturado manualmente'
  return 'Valor por defecto'
}

// Formateo de moneda, números y fechas (es-MX).

const currencyFmt = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const currencyFmt0 = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function money(value, { decimals = 2 } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return (decimals === 0 ? currencyFmt0 : currencyFmt).format(n)
}

/** Sin símbolo, para PDF/tablas alineadas. */
export function moneyPlain(value, { decimals = 2 } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function number(value, decimals = 0) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function km(value) {
  return `${number(value, value < 100 ? 1 : 0)} km`
}

/** Minutos -> "12 h 35 min" */
export function duration(minutes) {
  const m = Math.round(Number(minutes) || 0)
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (h <= 0) return `${rest} min`
  return rest ? `${h} h ${rest} min` : `${h} h`
}

/** 'YYYY-MM-DD' o ISO -> '14 sep 2026' */
export function dateLabel(value, { long = false } = {}) {
  if (!value) return '—'
  const d = parseDate(value)
  if (!d || Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: long ? 'long' : 'short',
    year: 'numeric',
  }).format(d)
}

export function dateTimeLabel(value) {
  if (!value) return '—'
  const d = parseDate(value)
  if (!d || Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** Interpreta 'YYYY-MM-DD' como fecha local (no UTC) para evitar corrimientos de día. */
export function parseDate(value) {
  if (value instanceof Date) return value
  if (typeof value !== 'string') return new Date(value)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(value)
}

export function todayISO() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function daysSince(iso) {
  if (!iso) return Infinity
  const d = parseDate(iso)
  if (!d || Number.isNaN(d.getTime())) return Infinity
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

/** Convierte lo que escriba el usuario ("1,250.50", " 12 ") a número. */
export function toNumber(value, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (value == null) return fallback
  const cleaned = String(value).replace(/[^0-9.,-]/g, '').replace(/,/g, '')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : fallback
}

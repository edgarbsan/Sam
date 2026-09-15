// Persistencia local con IndexedDB (idb). Sin servidor: todo vive en el celular.
import { openDB } from 'idb'
import { DEFAULT_SETTINGS, APIKEY_STORAGE_KEY, normalizeSettings } from './constants.js'

const DB_NAME = 'cotizador-fletes'
const DB_VERSION = 1
const STORE_QUOTES = 'quotes'
const STORE_SETTINGS = 'settings'
const STORE_META = 'meta'
const SETTINGS_KEY = 'app'
const FOLIO_KEY = 'folioCounter'

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_QUOTES)) {
          const store = db.createObjectStore(STORE_QUOTES, { keyPath: 'id' })
          store.createIndex('createdAt', 'createdAt')
          store.createIndex('folioNumber', 'folioNumber')
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS)
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META)
        }
      },
    })
  }
  return dbPromise
}

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

/* ------------------------------- Ajustes ------------------------------- */

export async function loadSettings() {
  try {
    const db = await getDB()
    const stored = await db.get(STORE_SETTINGS, SETTINGS_KEY)
    return normalizeSettings(stored || {})
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(settings) {
  const db = await getDB()
  const clean = normalizeSettings(settings)
  await db.put(STORE_SETTINGS, clean, SETTINGS_KEY)
  return clean
}

/** La API Key de Google vive en localStorage, como pide la especificación. */
export function getApiKey() {
  try {
    return localStorage.getItem(APIKEY_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function setApiKey(key) {
  try {
    if (key) localStorage.setItem(APIKEY_STORAGE_KEY, key.trim())
    else localStorage.removeItem(APIKEY_STORAGE_KEY)
  } catch {
    /* modo privado: la app sigue funcionando sin guardar */
  }
}

/* -------------------------------- Folios ------------------------------- */

/** Reserva el siguiente folio consecutivo de forma atómica. */
export async function nextFolio(prefix = 'COT') {
  const db = await getDB()
  const tx = db.transaction(STORE_META, 'readwrite')
  const current = (await tx.store.get(FOLIO_KEY)) || 0
  const next = current + 1
  await tx.store.put(next, FOLIO_KEY)
  await tx.done
  return { folioNumber: next, folio: formatFolio(next, prefix) }
}

export function formatFolio(n, prefix = 'COT') {
  const year = new Date().getFullYear()
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`
}

export async function peekFolioCounter() {
  const db = await getDB()
  return (await db.get(STORE_META, FOLIO_KEY)) || 0
}

/* ----------------------------- Cotizaciones ---------------------------- */

export async function listQuotes() {
  const db = await getDB()
  const all = await db.getAll(STORE_QUOTES)
  return all.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

export async function getQuote(id) {
  if (!id) return null
  const db = await getDB()
  return (await db.get(STORE_QUOTES, id)) || null
}

/**
 * Guarda una cotización. Si no trae folio, reserva uno nuevo.
 * Al editar conserva folio y fecha de creación.
 */
export async function saveQuote(quote, { folioPrefix = 'COT' } = {}) {
  const db = await getDB()
  const now = new Date().toISOString()
  let record = { ...quote }

  if (!record.id) record.id = newId()
  if (!record.folio) {
    const { folio, folioNumber } = await nextFolio(folioPrefix)
    record.folio = folio
    record.folioNumber = folioNumber
  }
  if (!record.createdAt) record.createdAt = now
  record.updatedAt = now

  await db.put(STORE_QUOTES, record)
  return record
}

export async function deleteQuote(id) {
  const db = await getDB()
  await db.delete(STORE_QUOTES, id)
}

export async function clearAllQuotes() {
  const db = await getDB()
  await db.clear(STORE_QUOTES)
}

/** Búsqueda local por folio, origen, destino o nombre del cliente. */
export function searchQuotes(quotes, term) {
  const q = String(term || '').trim().toLowerCase()
  if (!q) return quotes
  return quotes.filter((item) => {
    const haystack = [
      item.folio,
      item.trip?.origin?.description,
      item.trip?.destination?.description,
      item.trip?.clientName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

/** Respaldo completo en JSON (útil antes de cambiar de teléfono). */
export async function exportBackup() {
  const [quotes, settings, folioCounter] = await Promise.all([
    listQuotes(),
    loadSettings(),
    peekFolioCounter(),
  ])
  return { version: 1, exportedAt: new Date().toISOString(), folioCounter, settings, quotes }
}

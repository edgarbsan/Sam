// Valores por defecto y constantes de negocio.

export const IVA_RATE = 0.16

/** Leyenda obligatoria al pie de toda cotización. */
export const DEFAULT_DISCLAIMER =
  'Este servicio no incluye maniobras de carga ni descarga. La carga no cuenta con seguro ' +
  'de parte del transportista. Si desea asegurar su mercancía, deberá contratar un seguro ' +
  'por cuenta propia.'

/** Días tras los cuales el precio del diésel se marca como desactualizado. */
export const DIESEL_STALE_DAYS = 7

export const UNIT_LABEL = 'Caja seca 53 ft'

export const DEFAULT_SETTINGS = {
  companyName: '',
  rfc: '',
  phone: '',
  email: '',
  logoDataUrl: null,
  folioPrefix: 'COT',

  // Costos operativos
  dieselPrice: 25.9,
  dieselPriceDate: null, // ISO string
  dieselPriceSource: 'default', // 'default' | 'manual' | 'cre'
  operatorCostPerKm: 3.0,
  truckEfficiency: 2.0, // km por litro
  escortCostPerDay: 100,

  // Casetas
  tollPerKmFallback: 3.2, // MXN/km estimados para 5-6 ejes cuando no hay dato de la API
  tollAxleMultiplier: 2.6, // las APIs cotizan auto: se multiplica para trailer T3-S2

  // Presentación
  quoteValidityDays: 7,
  disclaimer: DEFAULT_DISCLAIMER,
  defaultQuoteMode: 'detallada', // 'detallada' | 'global'
  corsProxy: '', // opcional, para consultar la CRE si el navegador bloquea CORS
}

export const ROUTE_PREFERENCES = [
  { id: 'economica', label: 'Económica', hint: 'Menos casetas', emoji: '🟢' },
  { id: 'rapida', label: 'Rápida', hint: 'Menor tiempo', emoji: '🔵' },
]

export const QUOTE_MODES = [
  { id: 'detallada', label: 'Detallada', hint: 'Desglose por concepto' },
  { id: 'global', label: 'Global', hint: 'Un solo total' },
]

export const APIKEY_STORAGE_KEY = 'cotizador.googleMapsApiKey'

/** Campos que siempre deben guardarse como número. */
export const NUMERIC_SETTINGS = [
  'dieselPrice',
  'operatorCostPerKm',
  'truckEfficiency',
  'escortCostPerDay',
  'tollPerKmFallback',
  'tollAxleMultiplier',
  'quoteValidityDays',
]

/**
 * Convierte a número los campos numéricos (los formularios los manejan como
 * texto para poder escribir "25." antes de "25.9") y respeta los defaults.
 */
export function normalizeSettings(settings) {
  const out = { ...DEFAULT_SETTINGS, ...settings }
  for (const key of NUMERIC_SETTINGS) {
    const raw = out[key]
    const n = typeof raw === 'number' ? raw : Number.parseFloat(String(raw ?? '').replace(/[^0-9.-]/g, ''))
    out[key] = Number.isFinite(n) ? n : DEFAULT_SETTINGS[key]
  }
  if (!(out.truckEfficiency > 0)) out.truckEfficiency = DEFAULT_SETTINGS.truckEfficiency
  return out
}

// Estructura de una cotización y sus valores derivados.
// Todo se recalcula a partir de los insumos guardados: al editar una
// cotización vieja, los totales vuelven a salir solos.
import { computeCosts, computePricing, buildClientBreakdown } from './calc.js'
import { DEFAULT_SETTINGS, UNIT_LABEL } from './constants.js'
import { todayISO, toNumber } from './format.js'

export function emptyQuote(settings = DEFAULT_SETTINGS) {
  return {
    id: null,
    folio: null,
    folioNumber: null,
    createdAt: null,
    updatedAt: null,
    trip: {
      origin: null,
      destination: null,
      date: todayISO(),
      clientName: '',
      escortEnabled: false,
      escortDays: 1,
      escortCostPerDay: settings.escortCostPerDay ?? 100,
      routePreference: 'economica',
    },
    route: null,
    inputs: {
      dieselPrice: settings.dieselPrice ?? 0,
      dieselPriceDate: settings.dieselPriceDate ?? null,
      truckEfficiency: settings.truckEfficiency ?? 2,
      operatorCostPerKm: settings.operatorCostPerKm ?? 3,
      tolls: 0,
      tollsOverridden: false,
    },
    pricing: { marginPct: '', manualAdjust: 0 },
    presentation: { mode: settings.defaultQuoteMode || 'detallada', notes: '' },
    mapImage: null,
    company: { name: settings.companyName || '', rfc: settings.rfc || '' },
    unit: UNIT_LABEL,
  }
}

/**
 * Deja la cotización lista para guardarse: los formularios manejan texto
 * ("25.", "1,200") y aquí todo se vuelve número.
 */
export function normalizeQuote(quote) {
  const trip = quote?.trip || {}
  const inputs = quote?.inputs || {}
  const pricing = quote?.pricing || {}
  const efficiency = toNumber(inputs.truckEfficiency, 2)
  return {
    ...quote,
    trip: {
      ...trip,
      escortDays: Math.max(0, toNumber(trip.escortDays, 0)),
      escortCostPerDay: Math.max(0, toNumber(trip.escortCostPerDay, 0)),
    },
    inputs: {
      ...inputs,
      dieselPrice: Math.max(0, toNumber(inputs.dieselPrice, 0)),
      truckEfficiency: efficiency > 0 ? efficiency : 2,
      operatorCostPerKm: Math.max(0, toNumber(inputs.operatorCostPerKm, 0)),
      tolls: Math.max(0, toNumber(inputs.tolls, 0)),
    },
    pricing: {
      ...pricing,
      marginPct: toNumber(pricing.marginPct, 0),
      manualAdjust: toNumber(pricing.manualAdjust, 0),
    },
  }
}

/** Recalcula costos, precio y desglose al cliente. */
export function deriveQuote(quote) {
  const trip = quote?.trip || {}
  const inputs = quote?.inputs || {}
  const costs = computeCosts({
    distanceKm: quote?.route?.distanceKm || 0,
    dieselPrice: inputs.dieselPrice,
    truckEfficiency: inputs.truckEfficiency,
    operatorCostPerKm: inputs.operatorCostPerKm,
    tolls: inputs.tolls,
    escortEnabled: trip.escortEnabled,
    escortDays: trip.escortDays,
    escortCostPerDay: trip.escortCostPerDay,
  })
  const pricing = computePricing({
    costSubtotal: costs.subtotal,
    marginPct: Number(quote?.pricing?.marginPct) || 0,
    manualAdjust: Number(quote?.pricing?.manualAdjust) || 0,
  })
  const breakdown = buildClientBreakdown({ costs, pricing })
  return { costs, pricing, breakdown }
}

/** Texto corto "Origen → Destino" para listas y títulos. */
export function routeLabel(quote, { short = true } = {}) {
  const o = quote?.trip?.origin
  const d = quote?.trip?.destination
  const pick = (p) => (short ? p?.shortName || p?.description : p?.description || p?.shortName) || '—'
  return `${pick(o)} → ${pick(d)}`
}

export function isQuoteComplete(quote) {
  return Boolean(quote?.trip?.origin && quote?.trip?.destination && quote?.route?.distanceKm > 0)
}

// Motor de cálculo del cotizador. Funciones puras: sin DOM, sin red.
import { IVA_RATE } from './constants.js'

export function round2(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.round((v + Number.EPSILON) * 100) / 100
}

/**
 * Costos internos del viaje (lo que le cuesta al dueño).
 *
 * @param {object} input
 * @param {number} input.distanceKm       Kilómetros totales de la ruta.
 * @param {number} input.dieselPrice      Precio del litro de diésel.
 * @param {number} input.truckEfficiency  Rendimiento en km por litro (default 2).
 * @param {number} input.operatorCostPerKm Costo del operador por km (default 3).
 * @param {number} input.tolls            Casetas estimadas (TAG/IAVE).
 * @param {boolean} input.escortEnabled   ¿Requiere resguardo?
 * @param {number} input.escortDays       Días de resguardo.
 * @param {number} input.escortCostPerDay Costo por día de resguardo.
 */
export function computeCosts({
  distanceKm = 0,
  dieselPrice = 0,
  truckEfficiency = 2,
  operatorCostPerKm = 3,
  tolls = 0,
  escortEnabled = false,
  escortDays = 0,
  escortCostPerDay = 0,
} = {}) {
  const kmTotal = Math.max(0, Number(distanceKm) || 0)
  const efficiency = Number(truckEfficiency) > 0 ? Number(truckEfficiency) : 2
  const liters = kmTotal / efficiency
  const diesel = round2(liters * (Number(dieselPrice) || 0))
  const operator = round2(kmTotal * (Number(operatorCostPerKm) || 0))
  const tollsCost = round2(Math.max(0, Number(tolls) || 0))
  const escort = escortEnabled
    ? round2(Math.max(0, Number(escortDays) || 0) * Math.max(0, Number(escortCostPerDay) || 0))
    : 0
  const subtotal = round2(diesel + operator + tollsCost + escort)
  return {
    distanceKm: kmTotal,
    liters: round2(liters),
    diesel,
    operator,
    tolls: tollsCost,
    escort,
    subtotal,
    costPerKm: kmTotal > 0 ? round2(subtotal / kmTotal) : 0,
  }
}

/**
 * Precio de venta a partir del costo, el margen y un ajuste manual en pesos.
 * El ajuste manual se aplica DESPUÉS del margen y puede ser negativo.
 *
 * @returns {{margin:number, preIva:number, iva:number, total:number,
 *            profit:number, realMarginPct:number, belowCost:boolean}}
 */
export function computePricing({
  costSubtotal = 0,
  marginPct = 0,
  manualAdjust = 0,
  ivaRate = IVA_RATE,
} = {}) {
  const cost = Math.max(0, Number(costSubtotal) || 0)
  const pct = Number(marginPct) || 0
  const adjust = Number(manualAdjust) || 0
  const margin = round2(cost * (pct / 100))
  const preIvaRaw = cost + margin + adjust
  const preIva = round2(Math.max(0, preIvaRaw))
  const iva = round2(preIva * ivaRate)
  const total = round2(preIva + iva)
  const profit = round2(preIva - cost)
  return {
    cost,
    margin,
    manualAdjust: round2(adjust),
    preIva,
    iva,
    ivaRate,
    total,
    profit,
    realMarginPct: cost > 0 ? round2((profit / cost) * 100) : 0,
    belowCost: preIva < cost,
    clamped: preIvaRaw < 0,
  }
}

/**
 * Desglose que ve el CLIENTE en la cotización detallada.
 * Casetas y resguardo se muestran a costo; el margen viaja dentro del flete.
 */
export function buildClientBreakdown({ costs, pricing }) {
  const casetas = round2(costs?.tolls || 0)
  const resguardo = round2(costs?.escort || 0)
  const preIva = round2(pricing?.preIva || 0)
  let flete = round2(preIva - casetas - resguardo)
  let adjustedCasetas = casetas
  let adjustedResguardo = resguardo
  // Si el ajuste manual dejó el flete en negativo, se reparte todo en el flete
  // para no mostrarle al cliente un renglón absurdo.
  if (flete < 0) {
    flete = preIva
    adjustedCasetas = 0
    adjustedResguardo = 0
  }
  return {
    flete,
    casetas: adjustedCasetas,
    resguardo: adjustedResguardo,
    subtotal: preIva,
    iva: round2(pricing?.iva || 0),
    total: round2(pricing?.total || 0),
    collapsed: flete === preIva && (casetas > 0 || resguardo > 0),
  }
}

/** Casetas estimadas por km cuando la API no devuelve el dato. */
export function estimateTollsByKm(distanceKm, tollPerKm) {
  return round2(Math.max(0, Number(distanceKm) || 0) * Math.max(0, Number(tollPerKm) || 0))
}

/**
 * Costo variable de una ruta candidata (diésel + casetas). Sirve para elegir
 * la ruta "económica" entre las alternativas que devuelve Google.
 */
export function routeVariableCost(candidate, { dieselPrice, truckEfficiency, operatorCostPerKm = 0 }) {
  const c = computeCosts({
    distanceKm: candidate?.distanceKm || 0,
    dieselPrice,
    truckEfficiency,
    operatorCostPerKm,
    tolls: candidate?.tolls || 0,
  })
  return c.subtotal
}

/**
 * Elige la mejor ruta según la preferencia del usuario.
 * - 'rapida': menor tiempo.
 * - 'economica': menor costo variable (diésel + casetas); empate -> menor tiempo.
 */
export function pickRoute(candidates, preference, costParams) {
  const list = (candidates || []).filter((c) => c && Number.isFinite(c.distanceKm) && c.distanceKm > 0)
  if (!list.length) return null
  const scored = list.map((c) => ({
    ...c,
    variableCost: routeVariableCost(c, costParams || {}),
  }))
  scored.sort((a, b) => {
    if (preference === 'rapida') {
      if (a.durationMin !== b.durationMin) return a.durationMin - b.durationMin
      return a.variableCost - b.variableCost
    }
    if (Math.abs(a.variableCost - b.variableCost) > 0.5) return a.variableCost - b.variableCost
    return a.durationMin - b.durationMin
  })
  return scored[0]
}

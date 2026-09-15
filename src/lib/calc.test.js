import { describe, it, expect } from 'vitest'
import {
  computeCosts,
  computePricing,
  buildClientBreakdown,
  estimateTollsByKm,
  pickRoute,
  round2,
} from './calc.js'

describe('computeCosts', () => {
  it('calcula diésel con rendimiento de 2 km/l', () => {
    const c = computeCosts({ distanceKm: 1000, dieselPrice: 25, truckEfficiency: 2, operatorCostPerKm: 3 })
    expect(c.liters).toBe(500)
    expect(c.diesel).toBe(12500)
    expect(c.operator).toBe(3000)
  })

  it('suma casetas y resguardo al subtotal', () => {
    const c = computeCosts({
      distanceKm: 500,
      dieselPrice: 26,
      truckEfficiency: 2,
      operatorCostPerKm: 3,
      tolls: 2400,
      escortEnabled: true,
      escortDays: 3,
      escortCostPerDay: 100,
    })
    expect(c.diesel).toBe(6500)
    expect(c.operator).toBe(1500)
    expect(c.tolls).toBe(2400)
    expect(c.escort).toBe(300)
    expect(c.subtotal).toBe(10700)
  })

  it('ignora el resguardo cuando está apagado', () => {
    const c = computeCosts({ distanceKm: 100, escortEnabled: false, escortDays: 5, escortCostPerDay: 100 })
    expect(c.escort).toBe(0)
  })

  it('tolera entradas inválidas sin romperse', () => {
    const c = computeCosts({ distanceKm: 'abc', dieselPrice: null, truckEfficiency: 0 })
    expect(c.subtotal).toBe(0)
    expect(c.liters).toBe(0)
  })
})

describe('computePricing', () => {
  it('aplica margen y luego el ajuste manual', () => {
    const p = computePricing({ costSubtotal: 10000, marginPct: 20, manualAdjust: 500 })
    expect(p.margin).toBe(2000)
    expect(p.preIva).toBe(12500)
    expect(p.iva).toBe(2000)
    expect(p.total).toBe(14500)
    expect(p.profit).toBe(2500)
    expect(p.realMarginPct).toBe(25)
  })

  it('acepta ajustes negativos y avisa si queda bajo costo', () => {
    const p = computePricing({ costSubtotal: 10000, marginPct: 10, manualAdjust: -2000 })
    expect(p.preIva).toBe(9000)
    expect(p.belowCost).toBe(true)
  })

  it('no permite precios negativos', () => {
    const p = computePricing({ costSubtotal: 1000, marginPct: 0, manualAdjust: -5000 })
    expect(p.preIva).toBe(0)
    expect(p.total).toBe(0)
    expect(p.clamped).toBe(true)
  })

  it('sin margen capturado el precio es el costo', () => {
    const p = computePricing({ costSubtotal: 7345.67, marginPct: 0, manualAdjust: 0 })
    expect(p.preIva).toBe(7345.67)
    expect(p.iva).toBe(round2(7345.67 * 0.16))
  })
})

describe('buildClientBreakdown', () => {
  it('muestra casetas y resguardo a costo y el margen dentro del flete', () => {
    const costs = computeCosts({
      distanceKm: 500,
      dieselPrice: 26,
      truckEfficiency: 2,
      operatorCostPerKm: 3,
      tolls: 2400,
      escortEnabled: true,
      escortDays: 2,
      escortCostPerDay: 100,
    })
    const pricing = computePricing({ costSubtotal: costs.subtotal, marginPct: 25 })
    const b = buildClientBreakdown({ costs, pricing })
    expect(b.casetas).toBe(2400)
    expect(b.resguardo).toBe(200)
    expect(round2(b.flete + b.casetas + b.resguardo)).toBe(b.subtotal)
    expect(b.total).toBe(round2(b.subtotal * 1.16))
  })

  it('colapsa todo en el flete si el ajuste manual lo deja en negativo', () => {
    const costs = computeCosts({ distanceKm: 100, tolls: 5000 })
    const pricing = computePricing({ costSubtotal: costs.subtotal, marginPct: 0, manualAdjust: -4900 })
    const b = buildClientBreakdown({ costs, pricing })
    expect(b.casetas).toBe(0)
    expect(b.flete).toBe(b.subtotal)
    expect(b.collapsed).toBe(true)
  })
})

describe('estimateTollsByKm', () => {
  it('estima casetas por kilómetro', () => {
    expect(estimateTollsByKm(800, 3.2)).toBe(2560)
    expect(estimateTollsByKm(-5, 3.2)).toBe(0)
  })
})

describe('pickRoute', () => {
  const params = { dieselPrice: 26, truckEfficiency: 2, operatorCostPerKm: 3 }
  const candidates = [
    { id: 'a', distanceKm: 800, durationMin: 600, tolls: 3000 }, // cuota
    { id: 'b', distanceKm: 860, durationMin: 780, tolls: 400 }, // libre
  ]

  it('rápida elige el menor tiempo', () => {
    expect(pickRoute(candidates, 'rapida', params).id).toBe('a')
  })

  it('económica elige el menor costo variable', () => {
    expect(pickRoute(candidates, 'economica', params).id).toBe('b')
  })

  it('devuelve null sin candidatos válidos', () => {
    expect(pickRoute([], 'rapida', params)).toBeNull()
    expect(pickRoute([{ distanceKm: 0 }], 'rapida', params)).toBeNull()
  })
})

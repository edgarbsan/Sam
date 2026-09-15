import { describe, it, expect } from 'vitest'
import { emptyQuote, normalizeQuote, deriveQuote, routeLabel, isQuoteComplete } from './quoteModel.js'
import { DEFAULT_SETTINGS } from './constants.js'
import { normalizeSettings } from './constants.js'

describe('emptyQuote', () => {
  it('hereda los valores de ajustes y no propone margen', () => {
    const q = emptyQuote({ ...DEFAULT_SETTINGS, dieselPrice: 27.5, operatorCostPerKm: 3.5, escortCostPerDay: 150 })
    expect(q.inputs.dieselPrice).toBe(27.5)
    expect(q.inputs.operatorCostPerKm).toBe(3.5)
    expect(q.trip.escortCostPerDay).toBe(150)
    expect(q.pricing.marginPct).toBe('')
    expect(q.folio).toBeNull()
  })
})

describe('normalizeQuote', () => {
  it('convierte a número lo que el formulario dejó como texto', () => {
    const q = normalizeQuote({
      trip: { escortDays: '3', escortCostPerDay: '100' },
      inputs: { dieselPrice: '25.9', truckEfficiency: '', operatorCostPerKm: '3', tolls: '1,250.50' },
      pricing: { marginPct: '20', manualAdjust: '-500' },
    })
    expect(q.trip.escortDays).toBe(3)
    expect(q.inputs.dieselPrice).toBe(25.9)
    expect(q.inputs.truckEfficiency).toBe(2) // vacío -> rendimiento por defecto
    expect(q.inputs.tolls).toBe(1250.5)
    expect(q.pricing.marginPct).toBe(20)
    expect(q.pricing.manualAdjust).toBe(-500)
  })
})

describe('deriveQuote', () => {
  const quote = {
    trip: { escortEnabled: true, escortDays: 2, escortCostPerDay: 100 },
    route: { distanceKm: 800 },
    inputs: { dieselPrice: 25, truckEfficiency: 2, operatorCostPerKm: 3, tolls: 2000 },
    pricing: { marginPct: 20, manualAdjust: 0 },
  }

  it('recalcula todo desde los insumos guardados', () => {
    const { costs, pricing, breakdown } = deriveQuote(quote)
    expect(costs.diesel).toBe(10000) // 400 L × 25
    expect(costs.operator).toBe(2400)
    expect(costs.subtotal).toBe(14600)
    expect(pricing.preIva).toBe(17520)
    expect(breakdown.flete).toBe(17520 - 2000 - 200)
    expect(breakdown.total).toBe(20323.2)
  })

  it('editar un insumo cambia el resultado sin tocar nada más', () => {
    const editado = { ...quote, inputs: { ...quote.inputs, dieselPrice: 27 } }
    expect(deriveQuote(editado).costs.diesel).toBe(10800)
  })
})

describe('utilidades', () => {
  it('arma la etiqueta origen → destino', () => {
    expect(
      routeLabel({ trip: { origin: { shortName: 'Guadalajara' }, destination: { shortName: 'Monterrey' } } }),
    ).toBe('Guadalajara → Monterrey')
  })

  it('detecta cotizaciones incompletas', () => {
    expect(isQuoteComplete({ trip: {}, route: null })).toBe(false)
    expect(isQuoteComplete({ trip: { origin: {}, destination: {} }, route: { distanceKm: 10 } })).toBe(true)
  })
})

describe('normalizeSettings', () => {
  it('rescata valores inválidos con los defaults', () => {
    const s = normalizeSettings({ dieselPrice: '26.5', truckEfficiency: '0', operatorCostPerKm: 'abc' })
    expect(s.dieselPrice).toBe(26.5)
    expect(s.truckEfficiency).toBe(2)
    expect(s.operatorCostPerKm).toBe(DEFAULT_SETTINGS.operatorCostPerKm)
  })
})

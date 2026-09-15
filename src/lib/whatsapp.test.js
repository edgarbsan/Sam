import { describe, it, expect } from 'vitest'
import { buildWhatsAppMessage, whatsappUrl } from './whatsapp.js'
import { DEFAULT_SETTINGS } from './constants.js'

const settings = { ...DEFAULT_SETTINGS, companyName: 'Transportes Sam', quoteValidityDays: 7 }

const quote = {
  folio: 'COT-2026-0007',
  unit: 'Caja seca 53 ft',
  trip: {
    origin: { placeId: 'A', description: 'Guadalajara, Jalisco', shortName: 'Guadalajara' },
    destination: { placeId: 'B', description: 'Monterrey, Nuevo León', shortName: 'Monterrey' },
    date: '2026-10-01',
    escortEnabled: true,
    escortDays: 2,
    escortCostPerDay: 100,
  },
  route: { distanceKm: 800, durationMin: 540 },
  inputs: { dieselPrice: 25, truckEfficiency: 2, operatorCostPerKm: 3, tolls: 2000 },
  pricing: { marginPct: 20, manualAdjust: 0 },
  presentation: { mode: 'detallada' },
}

describe('buildWhatsAppMessage', () => {
  it('incluye folio, ruta, desglose y leyenda', () => {
    const text = buildWhatsAppMessage(quote, settings)
    expect(text).toContain('COT-2026-0007')
    expect(text).toContain('Guadalajara, Jalisco')
    expect(text).toContain('Casetas (TAG)')
    expect(text).toContain('IVA 16%')
    expect(text).toContain('maniobras de carga')
    expect(text).toContain('https://www.google.com/maps/dir/')
    expect(text).toContain('Vigencia de la cotización: 7 días')
  })

  it('el modo global oculta el desglose', () => {
    const text = buildWhatsAppMessage(quote, settings, 'global')
    expect(text).toContain('Total + IVA')
    expect(text).not.toContain('Casetas (TAG)')
    expect(text).not.toContain('Flete:')
  })

  it('arma la URL de wa.me con y sin número', () => {
    expect(whatsappUrl('hola')).toBe('https://wa.me/?text=hola')
    expect(whatsappUrl('hola', '33 1234 5678')).toContain('https://wa.me/3312345678?text=')
  })
})

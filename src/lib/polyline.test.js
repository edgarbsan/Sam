import { describe, it, expect } from 'vitest'
import { decodePolyline, encodePolyline, simplifyPath, boundsOf } from './polyline.js'

describe('polyline', () => {
  it('decodifica el ejemplo oficial de Google', () => {
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')
    expect(pts).toHaveLength(3)
    expect(pts[0].lat).toBeCloseTo(38.5, 5)
    expect(pts[0].lng).toBeCloseTo(-120.2, 5)
    expect(pts[2].lat).toBeCloseTo(43.252, 5)
    expect(pts[2].lng).toBeCloseTo(-126.453, 5)
  })

  it('codificar y decodificar es de ida y vuelta', () => {
    const original = [
      { lat: 20.6597, lng: -103.3496 },
      { lat: 22.1565, lng: -100.9855 },
      { lat: 25.6866, lng: -100.3161 },
    ]
    const back = decodePolyline(encodePolyline(original))
    back.forEach((p, i) => {
      expect(p.lat).toBeCloseTo(original[i].lat, 4)
      expect(p.lng).toBeCloseTo(original[i].lng, 4)
    })
  })

  it('simplifica conservando extremos', () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ lat: 20 + i * 0.01, lng: -103 + i * 0.01 }))
    const few = simplifyPath(many, 50)
    expect(few).toHaveLength(50)
    expect(few[0]).toEqual(many[0])
    expect(few[49]).toEqual(many[499])
  })

  it('calcula los límites', () => {
    const b = boundsOf([
      { lat: 20, lng: -103 },
      { lat: 25, lng: -100 },
    ])
    expect(b).toEqual({ minLat: 20, maxLat: 25, minLng: -103, maxLng: -100 })
    expect(boundsOf([])).toBeNull()
  })

  it('tolera cadenas vacías', () => {
    expect(decodePolyline('')).toEqual([])
    expect(decodePolyline(null)).toEqual([])
  })
})

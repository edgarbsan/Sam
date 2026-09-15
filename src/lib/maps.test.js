import { describe, it, expect, vi, afterEach } from 'vitest'
import { getRouteCandidates, buildDirectionsLink, buildStaticMapUrl, computeRoutesRest } from './maps.js'

const ORIGIN = { placeId: 'A', description: 'Guadalajara, Jalisco', shortName: 'Guadalajara' }
const DESTINATION = { placeId: 'B', description: 'Monterrey, Nuevo León', shortName: 'Monterrey' }
const SETTINGS = { tollAxleMultiplier: 2.5, tollPerKmFallback: 3 }

function routesResponse(routes) {
  return {
    ok: true,
    json: async () => ({ routes }),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getRouteCandidates', () => {
  it('convierte la respuesta de Routes API y aplica el factor de ejes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        routesResponse([
          {
            distanceMeters: 800000,
            duration: '32400s',
            description: 'Autopista del Occidente',
            polyline: { encodedPolyline: '' },
            travelAdvisory: { tollInfo: { estimatedPrice: [{ currencyCode: 'MXN', units: '1200', nanos: 500000000 }] } },
          },
        ]),
      ),
    )
    const { candidates, tollSource } = await getRouteCandidates({
      apiKey: 'fake',
      origin: ORIGIN,
      destination: DESTINATION,
      preference: 'rapida',
      settings: SETTINGS,
    })
    expect(tollSource).toBe('routes-api')
    expect(candidates).toHaveLength(1)
    expect(candidates[0].distanceKm).toBe(800)
    expect(candidates[0].durationMin).toBe(540)
    expect(candidates[0].tolls).toBe(3001.25) // 1200.50 × 2.5
    expect(candidates[0].tollKind).toContain('Google')
  })

  it('estima casetas por km cuando Google no las reporta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        routesResponse([{ distanceMeters: 500000, duration: '18000s', polyline: { encodedPolyline: '' } }]),
      ),
    )
    const { candidates } = await getRouteCandidates({
      apiKey: 'fake',
      origin: ORIGIN,
      destination: DESTINATION,
      preference: 'rapida',
      settings: SETTINGS,
    })
    expect(candidates[0].tolls).toBe(1500) // 500 km × $3
    expect(candidates[0].tollKind).toBe('estimado por km')
  })

  it('en modo económica pide además la ruta libre y la marca sin casetas', async () => {
    const fetchMock = vi.fn(async (_url, options) => {
      const body = JSON.parse(options.body)
      return body.routeModifiers.avoidTolls
        ? routesResponse([{ distanceMeters: 870000, duration: '39600s', polyline: { encodedPolyline: '' } }])
        : routesResponse([
            {
              distanceMeters: 800000,
              duration: '32400s',
              polyline: { encodedPolyline: '' },
              travelAdvisory: { tollInfo: { estimatedPrice: [{ currencyCode: 'MXN', units: '1000' }] } },
            },
          ])
    })
    vi.stubGlobal('fetch', fetchMock)

    const { candidates } = await getRouteCandidates({
      apiKey: 'fake',
      origin: ORIGIN,
      destination: DESTINATION,
      preference: 'economica',
      settings: SETTINGS,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(candidates).toHaveLength(2)
    const free = candidates.find((c) => c.avoidTolls)
    expect(free.tolls).toBe(0)
    expect(free.distanceKm).toBe(870)
  })

  it('descarta alternativas duplicadas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        routesResponse([
          { distanceMeters: 800000, duration: '32400s', polyline: { encodedPolyline: '' } },
          { distanceMeters: 800100, duration: '32401s', polyline: { encodedPolyline: '' } },
        ]),
      ),
    )
    const { candidates } = await getRouteCandidates({
      apiKey: 'fake',
      origin: ORIGIN,
      destination: DESTINATION,
      preference: 'rapida',
      settings: SETTINGS,
    })
    expect(candidates).toHaveLength(1)
  })

  it('exige API Key', async () => {
    await expect(
      getRouteCandidates({ apiKey: '', origin: ORIGIN, destination: DESTINATION, settings: SETTINGS }),
    ).rejects.toThrow(/API Key/i)
  })
})

describe('computeRoutesRest', () => {
  it('manda el pase TAG y el modo diésel', async () => {
    const fetchMock = vi.fn(async () => routesResponse([{ distanceMeters: 1000, duration: '60s' }]))
    vi.stubGlobal('fetch', fetchMock)
    await computeRoutesRest({ apiKey: 'k', origin: ORIGIN, destination: DESTINATION })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.routeModifiers.tollPasses).toContain('MX_TAG_IAVE')
    expect(body.routeModifiers.vehicleInfo.emissionType).toBe('DIESEL')
    expect(body.extraComputations).toContain('TOLLS')
    expect(fetchMock.mock.calls[0][1].headers['X-Goog-Api-Key']).toBe('k')
  })

  it('propaga el error de Google con su mensaje', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ error: { message: 'Routes API has not been used' } }) })),
    )
    await expect(computeRoutesRest({ apiKey: 'k', origin: ORIGIN, destination: DESTINATION })).rejects.toThrow(
      /Routes API has not been used/,
    )
  })
})

describe('enlaces', () => {
  it('arma la liga de Google Maps con place ids', () => {
    const url = buildDirectionsLink({ origin: ORIGIN, destination: DESTINATION })
    expect(url).toContain('https://www.google.com/maps/dir/?')
    expect(url).toContain('origin_place_id=A')
    expect(url).toContain('destination_place_id=B')
    expect(url).toContain('travelmode=driving')
  })

  it('arma la URL del mapa estático con la ruta codificada', () => {
    const url = buildStaticMapUrl({
      apiKey: 'k',
      path: [
        { lat: 20.6, lng: -103.3 },
        { lat: 25.6, lng: -100.3 },
      ],
    })
    expect(url).toContain('staticmap?')
    expect(url).toContain('path=color:0x9e4f24ff')
    expect(url).toContain('markers=color:0x15803d')
  })
})

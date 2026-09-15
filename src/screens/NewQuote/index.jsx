import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import AppShell from '../../components/layout/AppShell.jsx'
import StepHeader from './StepHeader.jsx'
import Step1Trip from './Step1Trip.jsx'
import Step2Costs from './Step2Costs.jsx'
import Step3Margin from './Step3Margin.jsx'
import Step4Share from './Step4Share.jsx'
import { Button, Modal } from '../../components/ui/index.jsx'
import { useSettings } from '../../state/SettingsContext.jsx'
import { useToast } from '../../state/ToastContext.jsx'
import { emptyQuote, deriveQuote, normalizeQuote } from '../../lib/quoteModel.js'
import { getRouteCandidates } from '../../lib/maps.js'
import { captureRouteImage } from '../../lib/mapImage.js'
import { pickRoute, estimateTollsByKm } from '../../lib/calc.js'
import { getQuote, saveQuote } from '../../lib/db.js'
import { parseDate, km as kmLabel, duration } from '../../lib/format.js'

const DRAFT_KEY = 'cotizador.draft'

function routeKeyOf(trip) {
  return [
    trip.origin?.placeId || trip.origin?.description,
    trip.destination?.placeId || trip.destination?.description,
    trip.date,
    trip.routePreference,
  ].join('|')
}

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeDraft(quote) {
  try {
    // El mapa (dataURL) no se guarda en el borrador: pesa demasiado.
    const { mapImage, ...rest } = quote
    localStorage.setItem(DRAFT_KEY, JSON.stringify(rest))
  } catch {
    /* sin espacio: el borrador es opcional */
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignorado */
  }
}

export default function NewQuoteScreen() {
  const { settings, apiKey, hasApiKey, ready } = useSettings()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const editId = params.get('edit')

  const [step, setStep] = useState(1)
  const [quote, setQuote] = useState(() => emptyQuote(settings))
  const [routeState, setRouteState] = useState({ loading: false, error: '', warnings: [], candidates: [], tollSource: '' })
  const [saving, setSaving] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const seededRef = useRef(false)
  const prefRef = useRef(quote.trip.routePreference)
  const persistTimer = useRef(null)
  const navKeyRef = useRef(location.key)

  /* ------------------------- Carga inicial / edición ------------------------ */

  useEffect(() => {
    if (!ready || seededRef.current) return
    seededRef.current = true

    if (editId) {
      getQuote(editId).then((found) => {
        if (!found) {
          toast.error('No se encontró la cotización que querías editar.')
          setParams({}, { replace: true })
          return
        }
        setQuote(found)
        setStep(1)
      })
      return
    }

    const draft = readDraft()
    const base = emptyQuote(settings)
    if (draft?.trip?.origin && draft?.trip?.destination) {
      setQuote({ ...base, ...draft, inputs: { ...base.inputs, ...draft.inputs } })
      toast.toast('Se restauró tu borrador anterior.')
    } else {
      setQuote(base)
    }
  }, [ready, editId, settings, setParams, toast])

  /* ------------------------------- Borrador -------------------------------- */

  useEffect(() => {
    if (!seededRef.current || editId || quote.folio) return
    writeDraft(quote)
  }, [quote, editId])

  /* ------------------------------- Mutadores ------------------------------- */

  const patchTrip = useCallback((patch) => setQuote((q) => ({ ...q, trip: { ...q.trip, ...patch } })), [])
  const patchInputs = useCallback((patch) => setQuote((q) => ({ ...q, inputs: { ...q.inputs, ...patch } })), [])
  const patchPricing = useCallback((patch) => setQuote((q) => ({ ...q, pricing: { ...q.pricing, ...patch } })), [])
  const patchPresentation = useCallback(
    (patch) => setQuote((q) => ({ ...q, presentation: { ...q.presentation, ...patch } })),
    [],
  )

  const derived = useMemo(() => deriveQuote(quote), [quote])

  /* ---------------------------- Cálculo de ruta ---------------------------- */

  const applyCandidate = useCallback((candidate, trip) => {
    setQuote((q) => ({
      ...q,
      route: {
        id: candidate.id,
        summary: candidate.summary,
        distanceKm: candidate.distanceKm,
        durationMin: candidate.durationMin,
        polyline: candidate.polyline,
        path: candidate.path,
        avoidTolls: candidate.avoidTolls,
        tollKind: candidate.tollKind,
        source: candidate.source,
        key: routeKeyOf(trip || q.trip),
      },
      inputs: { ...q.inputs, tolls: candidate.tolls, tollsOverridden: false },
    }))
  }, [])

  const captureMap = useCallback(
    (candidate, trip) => {
      captureRouteImage({
        apiKey,
        path: candidate.path,
        origin: trip.origin,
        destination: trip.destination,
        distanceLabel: kmLabel(candidate.distanceKm),
        durationLabel: duration(candidate.durationMin),
      }).then((image) => {
        if (image?.dataUrl) setQuote((q) => ({ ...q, mapImage: image }))
      })
    },
    [apiKey],
  )

  const calculateRoute = useCallback(async () => {
    const trip = quote.trip
    if (!trip.origin || !trip.destination) return
    setRouteState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const departure = trip.date ? new Date(parseDate(trip.date).getTime() + 8 * 3600 * 1000) : null
      const { candidates, warnings, tollSource } = await getRouteCandidates({
        apiKey,
        origin: trip.origin,
        destination: trip.destination,
        departureTime: departure,
        preference: trip.routePreference,
        settings,
      })
      const chosen = pickRoute(candidates, trip.routePreference, {
        dieselPrice: quote.inputs.dieselPrice,
        truckEfficiency: quote.inputs.truckEfficiency,
        operatorCostPerKm: quote.inputs.operatorCostPerKm,
      })
      if (!chosen) throw new Error('No se obtuvo ninguna ruta utilizable.')
      applyCandidate(chosen, trip)
      captureMap(chosen, trip)
      setRouteState({ loading: false, error: '', warnings: warnings || [], candidates, tollSource })
    } catch (err) {
      setRouteState((s) => ({ ...s, loading: false, error: err?.message || 'Error desconocido al calcular la ruta.' }))
    }
  }, [quote.trip, quote.inputs, apiKey, settings, applyCandidate, captureMap])

  const goToCosts = useCallback(() => {
    setStep(2)
    const fresh = quote.route?.key === routeKeyOf(quote.trip) && quote.route?.distanceKm > 0
    if (!fresh) calculateRoute()
  }, [quote.route, quote.trip, calculateRoute])

  // Cambiar la preferencia en el paso 2 vuelve a elegir (o a consultar) la ruta.
  useEffect(() => {
    const pref = quote.trip.routePreference
    if (prefRef.current === pref) return
    prefRef.current = pref
    if (step !== 2 || routeState.loading) return
    const candidates = routeState.candidates || []
    const needsFetch = pref === 'economica' && !candidates.some((c) => c.avoidTolls)
    if (!candidates.length || needsFetch) {
      calculateRoute()
      return
    }
    const chosen = pickRoute(candidates, pref, {
      dieselPrice: quote.inputs.dieselPrice,
      truckEfficiency: quote.inputs.truckEfficiency,
      operatorCostPerKm: quote.inputs.operatorCostPerKm,
    })
    if (chosen) {
      applyCandidate(chosen, quote.trip)
      captureMap(chosen, quote.trip)
    }
  }, [quote.trip, quote.inputs, step, routeState, calculateRoute, applyCandidate, captureMap])

  const selectCandidate = useCallback(
    (candidate) => {
      applyCandidate(candidate, quote.trip)
      captureMap(candidate, quote.trip)
    },
    [applyCandidate, captureMap, quote.trip],
  )

  const setManualRoute = useCallback(
    ({ distanceKm, durationMin }) => {
      setQuote((q) => ({
        ...q,
        route: {
          id: 'manual',
          summary: 'Kilómetros capturados a mano',
          distanceKm,
          durationMin,
          path: [],
          manual: true,
          tollKind: 'estimado por km',
          key: routeKeyOf(q.trip),
        },
        inputs: {
          ...q.inputs,
          tolls: q.inputs.tollsOverridden ? q.inputs.tolls : estimateTollsByKm(distanceKm, settings.tollPerKmFallback),
        },
      }))
      setRouteState({ loading: false, error: '', warnings: ['Ruta capturada a mano: las casetas son una estimación por kilómetro.'], candidates: [], tollSource: 'manual' })
    },
    [settings.tollPerKmFallback],
  )

  /* -------------------------------- Guardar -------------------------------- */

  const commitQuote = useCallback(async () => {
    setSaving(true)
    try {
      const saved = await saveQuote(normalizeQuote(quote), { folioPrefix: settings.folioPrefix })
      setQuote(saved)
      clearDraft()
      setStep(4)
      toast.success(`Cotización ${saved.folio} guardada.`)
    } catch (err) {
      toast.error(`No se pudo guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }, [quote, settings.folioPrefix, toast])

  // En el paso 4, los cambios de presentación se guardan solos.
  useEffect(() => {
    if (step !== 4 || !quote.id) return undefined
    clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      saveQuote(quote, { folioPrefix: settings.folioPrefix }).catch(() => {})
    }, 700)
    return () => clearTimeout(persistTimer.current)
  }, [quote, step, settings.folioPrefix])

  const resetWizard = useCallback(() => {
    clearDraft()
    setQuote(emptyQuote(settings))
    setRouteState({ loading: false, error: '', warnings: [], candidates: [], tollSource: '' })
    setStep(1)
    setConfirmReset(false)
    if (editId) setParams({}, { replace: true })
  }, [settings, editId, setParams])

  // Entrar de nuevo a "Nueva" (barra inferior) con una cotización ya generada
  // arranca una limpia; un borrador a medias se respeta.
  useEffect(() => {
    if (location.key === navKeyRef.current) return
    navKeyRef.current = location.key
    if (editId || !quote.folio) return
    resetWizard()
  }, [location.key, editId, quote.folio, resetWizard])

  /* --------------------------------- Vista --------------------------------- */

  const titles = ['Nueva cotización', 'Ruta y costos', 'Margen y precio', 'Compartir']
  const subtitle = quote.folio ? `Folio ${quote.folio}` : editId ? 'Editando cotización' : 'Caja seca 53 ft'

  return (
    <AppShell
      title={titles[step - 1]}
      subtitle={subtitle}
      action={
        step === 1 && (quote.trip.origin || quote.trip.destination) ? (
          <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
            Limpiar
          </Button>
        ) : null
      }
    >
      <StepHeader step={step} />

      {step === 1 && (
        <Step1Trip quote={quote} patchTrip={patchTrip} onNext={goToCosts} hasApiKey={hasApiKey} />
      )}

      {step === 2 && (
        <Step2Costs
          quote={quote}
          derived={derived}
          routeState={routeState}
          settings={settings}
          patchInputs={patchInputs}
          patchTrip={patchTrip}
          onSelectCandidate={selectCandidate}
          onManualRoute={setManualRoute}
          onRetry={calculateRoute}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <Step3Margin
          quote={quote}
          derived={derived}
          patchPricing={patchPricing}
          onBack={() => setStep(2)}
          onNext={commitQuote}
          saving={saving}
        />
      )}

      {step === 4 && (
        <Step4Share
          quote={quote}
          settings={settings}
          patchPresentation={patchPresentation}
          onBack={() => setStep(3)}
          onNewQuote={resetWizard}
          onGoHistory={() => navigate('/historial')}
        />
      )}

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="¿Limpiar la cotización?"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button variant="danger" className="flex-1" onClick={resetWizard}>
              Limpiar
            </Button>
          </>
        }
      >
        Se borrarán los datos capturados en este formulario. Las cotizaciones ya guardadas no se tocan.
      </Modal>
    </AppShell>
  )
}

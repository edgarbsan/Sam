import { useState } from 'react'
import { Banner, Button, Card, Divider, Field, NumberInput, RouteSkeleton, Row, Segmented } from '../../components/ui/index.jsx'
import RouteMap from '../../components/RouteMap.jsx'
import { RefreshIcon } from '../../components/layout/Icons.jsx'
import { money, km as kmLabel, duration, number, dateLabel } from '../../lib/format.js'
import { ROUTE_PREFERENCES } from '../../lib/constants.js'
import { isDieselStale } from '../../lib/diesel.js'

function CandidateCard({ candidate, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
        active ? 'border-brand-500 bg-brand-500/10' : 'border-ink-700 bg-ink-850 hover:bg-ink-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-zinc-100">{candidate.summary}</span>
        {active && <span className="shrink-0 text-[10px] font-bold uppercase text-brand-400">Elegida</span>}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-400 tabular">
        <span>{kmLabel(candidate.distanceKm)}</span>
        <span>{duration(candidate.durationMin)}</span>
        <span>Casetas {money(candidate.tolls, { decimals: 0 })}</span>
      </div>
    </button>
  )
}

export default function Step2Costs({
  quote,
  derived,
  routeState,
  settings,
  patchInputs,
  patchTrip,
  onSelectCandidate,
  onManualRoute,
  onRetry,
  onBack,
  onNext,
}) {
  const [manualOpen, setManualOpen] = useState(false)
  const [manualKm, setManualKm] = useState('')
  const [manualMin, setManualMin] = useState('')
  const { costs } = derived
  const route = quote.route
  const inputs = quote.inputs
  const dieselNeverSet = !inputs.dieselPriceDate
  const dieselStale = !dieselNeverSet && isDieselStale(inputs.dieselPriceDate)

  if (routeState.loading) {
    return (
      <div className="space-y-4">
        <RouteSkeleton />
        <Button variant="secondary" full onClick={onBack}>
          Cancelar
        </Button>
      </div>
    )
  }

  if (routeState.error && !route) {
    return (
      <div className="space-y-4">
        <Banner tone="error" title="No se pudo calcular la ruta">
          {routeState.error}
        </Banner>
        <Button full onClick={onRetry}>
          <RefreshIcon className="h-5 w-5" /> Reintentar
        </Button>

        {!manualOpen ? (
          <Button variant="secondary" full onClick={() => setManualOpen(true)}>
            Capturar kilómetros manualmente
          </Button>
        ) : (
          <Card title="Captura manual">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kilómetros totales" required>
                <NumberInput value={manualKm} onChange={setManualKm} suffix="km" min={0} />
              </Field>
              <Field label="Tiempo estimado" hint="Opcional">
                <NumberInput value={manualMin} onChange={setManualMin} suffix="min" min={0} inputMode="numeric" step="1" />
              </Field>
            </div>
            <Button
              className="mt-3"
              full
              disabled={!Number(manualKm)}
              onClick={() => onManualRoute({ distanceKm: Number(manualKm), durationMin: Number(manualMin) || 0 })}
            >
              Usar estos datos
            </Button>
          </Card>
        )}

        <Button variant="ghost" full onClick={onBack}>
          Regresar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {routeState.warnings?.map((w) => (
        <Banner key={w} tone="warn">
          {w}
        </Banner>
      ))}
      {routeState.error && route && (
        <Banner tone="warn" title="Se usaron datos anteriores">
          {routeState.error}
        </Banner>
      )}

      <Card title="Ruta" padded={false} className="overflow-hidden">
        <RouteMap path={route?.path} fallbackImage={quote.mapImage?.dataUrl} className="h-48" />
        <div className="p-4">
          <p className="truncate text-sm font-medium text-zinc-100">{route?.summary || 'Ruta capturada a mano'}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-ink-850 py-2">
              <p className="text-[11px] uppercase text-zinc-500">Distancia</p>
              <p className="tabular text-base font-semibold text-zinc-100">{kmLabel(route?.distanceKm || 0)}</p>
            </div>
            <div className="rounded-xl bg-ink-850 py-2">
              <p className="text-[11px] uppercase text-zinc-500">Tiempo</p>
              <p className="tabular text-base font-semibold text-zinc-100">{duration(route?.durationMin || 0)}</p>
            </div>
            <div className="rounded-xl bg-ink-850 py-2">
              <p className="text-[11px] uppercase text-zinc-500">Salida</p>
              <p className="text-base font-semibold text-zinc-100">{dateLabel(quote.trip.date)}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="label-base">Preferencia</p>
            <Segmented
              options={ROUTE_PREFERENCES}
              value={quote.trip.routePreference}
              onChange={(v) => patchTrip({ routePreference: v })}
            />
          </div>

          {routeState.candidates?.length > 1 && (
            <div className="mt-4 space-y-2">
              <p className="label-base mb-0">Alternativas ({routeState.candidates.length})</p>
              {routeState.candidates.map((c) => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  active={c.id === route?.id}
                  onSelect={() => onSelectCandidate(c)}
                />
              ))}
            </div>
          )}

          <Button variant="ghost" size="sm" className="mt-3" onClick={onRetry}>
            <RefreshIcon className="h-4 w-4" /> Recalcular ruta
          </Button>
        </div>
      </Card>

      <Card title="Costos internos" subtitle="Solo tú ves este desglose">
        <Row
          label="Diésel"
          hint={`${number(costs.liters, 0)} L · ${inputs.truckEfficiency} km/L · ${money(inputs.dieselPrice)}/L`}
          value={money(costs.diesel)}
        />
        <Row
          label="Operador"
          hint={`${kmLabel(route?.distanceKm || 0)} × ${money(inputs.operatorCostPerKm)}/km`}
          value={money(costs.operator)}
        />
        <Row
          label="Casetas (TAG)"
          hint={route?.tollKind ? `Origen: ${route.tollKind}` : undefined}
          value={money(costs.tolls)}
        />
        {quote.trip.escortEnabled && (
          <Row
            label="Resguardo"
            hint={`${quote.trip.escortDays} día(s) × ${money(quote.trip.escortCostPerDay)}`}
            value={money(costs.escort)}
          />
        )}
        <Divider />
        <Row label="Subtotal de costos" value={money(costs.subtotal)} strong />
        <p className="mt-1 text-right text-xs text-zinc-500 tabular">{money(costs.costPerKm)} por km</p>
      </Card>

      <Card title="Ajustes de este viaje" subtitle="Solo afectan esta cotización">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Precio del diésel"
            hint={
              dieselNeverSet
                ? 'Valor por defecto: actualízalo en Ajustes'
                : dieselStale
                  ? '⚠️ Precio desactualizado'
                  : `Actualizado: ${dateLabel(inputs.dieselPriceDate)}`
            }
          >
            <NumberInput
              value={String(inputs.dieselPrice ?? '')}
              onChange={(v) => patchInputs({ dieselPrice: v })}
              prefix="$"
              min={0}
            />
          </Field>
          <Field label="Casetas" hint={route?.tollKind || 'Editable'}>
            <NumberInput
              value={String(inputs.tolls ?? '')}
              onChange={(v) => patchInputs({ tolls: v, tollsOverridden: true })}
              prefix="$"
              min={0}
            />
          </Field>
          <Field label="Rendimiento">
            <NumberInput
              value={String(inputs.truckEfficiency ?? '')}
              onChange={(v) => patchInputs({ truckEfficiency: v })}
              suffix="km/L"
              min={0.1}
            />
          </Field>
          <Field label="Operador por km">
            <NumberInput
              value={String(inputs.operatorCostPerKm ?? '')}
              onChange={(v) => patchInputs({ operatorCostPerKm: v })}
              prefix="$"
              min={0}
            />
          </Field>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" size="lg" onClick={onBack} className="flex-1">
          Atrás
        </Button>
        <Button size="lg" onClick={onNext} className="flex-[2]" disabled={!(route?.distanceKm > 0)}>
          Definir margen
        </Button>
      </div>
    </div>
  )
}

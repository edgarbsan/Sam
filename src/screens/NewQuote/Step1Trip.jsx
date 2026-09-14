import { Button, Card, Field, NumberInput, Segmented, Toggle, TextInput, Banner } from '../../components/ui/index.jsx'
import PlaceAutocomplete from '../../components/PlaceAutocomplete.jsx'
import { PinIcon, FlagIcon } from '../../components/layout/Icons.jsx'
import { ROUTE_PREFERENCES } from '../../lib/constants.js'
import { money } from '../../lib/format.js'

export default function Step1Trip({ quote, patchTrip, onNext, hasApiKey }) {
  const trip = quote.trip
  const ready = Boolean(trip.origin && trip.destination && trip.date)

  return (
    <div className="space-y-4">
      {!hasApiKey && (
        <Banner tone="warn" title="Falta tu API Key de Google Maps">
          Sin ella no se pueden calcular rutas ni casetas. Puedes capturarla en Ajustes; mientras tanto podrás
          escribir las direcciones y los kilómetros a mano.
        </Banner>
      )}

      <Card title="Ruta del viaje">
        <div className="space-y-4">
          <PlaceAutocomplete
            label="Origen"
            required
            icon={<PinIcon className="h-5 w-5" />}
            placeholder="Ciudad, colonia o dirección"
            value={trip.origin}
            onChange={(place) => patchTrip({ origin: place })}
          />
          <PlaceAutocomplete
            label="Destino"
            required
            icon={<FlagIcon className="h-5 w-5" />}
            placeholder="Ciudad, colonia o dirección"
            value={trip.destination}
            onChange={(place) => patchTrip({ destination: place })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha del viaje" required>
              <input
                type="date"
                className="input-base"
                value={trip.date || ''}
                onChange={(e) => patchTrip({ date: e.target.value })}
              />
            </Field>
            <Field label="Cliente" hint="Opcional">
              <TextInput
                placeholder="Nombre del cliente"
                value={trip.clientName || ''}
                onChange={(e) => patchTrip({ clientName: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Resguardo">
        <Toggle
          label="¿Requiere resguardo?"
          hint="Custodia o pernocta vigilada durante el viaje"
          checked={trip.escortEnabled}
          onChange={(v) => patchTrip({ escortEnabled: v })}
        />
        {trip.escortEnabled && (
          <div className="mt-4 grid grid-cols-2 gap-3 animate-fade-in">
            <Field label="Días">
              <NumberInput
                value={String(trip.escortDays ?? '')}
                onChange={(v) => patchTrip({ escortDays: v })}
                min={0}
                step="1"
                inputMode="numeric"
                suffix="días"
              />
            </Field>
            <Field label="Costo por día">
              <NumberInput
                value={String(trip.escortCostPerDay ?? '')}
                onChange={(v) => patchTrip({ escortCostPerDay: v })}
                min={0}
                prefix="$"
              />
            </Field>
            <p className="col-span-2 text-xs text-zinc-500">
              Resguardo estimado:{' '}
              <span className="text-zinc-300">
                {money((Number(trip.escortDays) || 0) * (Number(trip.escortCostPerDay) || 0))}
              </span>
            </p>
          </div>
        )}
      </Card>

      <Card title="Preferencia de ruta">
        <Segmented
          options={ROUTE_PREFERENCES}
          value={trip.routePreference}
          onChange={(v) => patchTrip({ routePreference: v })}
        />
        <p className="hint-base">
          {trip.routePreference === 'economica'
            ? 'Se compara la ruta de cuota contra la libre y se elige la de menor costo total (diésel + casetas).'
            : 'Se elige la ruta de menor tiempo estimado, aunque tenga más casetas.'}
        </p>
      </Card>

      <Button size="lg" full onClick={onNext} disabled={!ready}>
        Calcular ruta y costos
      </Button>
      {!ready && <p className="text-center text-xs text-zinc-500">Captura origen, destino y fecha para continuar.</p>}
    </div>
  )
}

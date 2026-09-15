import { Banner, Button, Card, Divider, Field, NumberInput, Row } from '../../components/ui/index.jsx'
import { money, km as kmLabel, number } from '../../lib/format.js'
import { IVA_RATE } from '../../lib/constants.js'

const QUICK_MARGINS = [10, 15, 20, 25, 30, 40]

export default function Step3Margin({ quote, derived, patchPricing, onBack, onNext, saving }) {
  const { costs, pricing } = derived
  const distance = quote.route?.distanceKm || 0
  const marginValue = quote.pricing.marginPct

  return (
    <div className="space-y-4">
      <Card title="Costo interno" subtitle="Nunca se muestra al cliente">
        <Row label="Diésel" value={money(costs.diesel)} />
        <Row label="Operador" value={money(costs.operator)} />
        <Row label="Casetas (TAG)" value={money(costs.tolls)} />
        {costs.escort > 0 && <Row label="Resguardo" value={money(costs.escort)} />}
        <Divider />
        <Row label="Subtotal de costos" value={money(costs.subtotal)} strong />
      </Card>

      <Card title="Margen de ganancia">
        <Field label="Margen %" hint="Se aplica sobre el costo interno. Sin valor por defecto: tú decides.">
          <NumberInput
            value={String(marginValue ?? '')}
            onChange={(v) => patchPricing({ marginPct: v })}
            suffix="%"
            placeholder="0"
            min={0}
            max={500}
            autoFocus
          />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_MARGINS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => patchPricing({ marginPct: String(m) })}
              className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                Number(marginValue) === m
                  ? 'border-carne-600 bg-carne-200 text-carne-700'
                  : 'border-crema-400 bg-crema-100 text-cacao-700 hover:bg-crema-200'
              }`}
            >
              {m}%
            </button>
          ))}
        </div>

        <Divider className="my-4" />

        <Field label="Ajuste manual $" hint="Sube o baja el precio final libremente. Acepta negativos.">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              className="w-14 shrink-0"
              onClick={() => patchPricing({ manualAdjust: String((Number(quote.pricing.manualAdjust) || 0) - 100) })}
              aria-label="Restar 100"
            >
              −100
            </Button>
            <NumberInput
              className="flex-1"
              value={String(quote.pricing.manualAdjust ?? '')}
              onChange={(v) => patchPricing({ manualAdjust: v })}
              prefix="$"
              allowNegative
              placeholder="0"
            />
            <Button
              variant="secondary"
              size="md"
              className="w-14 shrink-0"
              onClick={() => patchPricing({ manualAdjust: String((Number(quote.pricing.manualAdjust) || 0) + 100) })}
              aria-label="Sumar 100"
            >
              +100
            </Button>
          </div>
        </Field>
      </Card>

      <Card title="Precio de venta" className="border-carne-400 bg-gradient-to-b from-carne-200/70 to-transparent">
        <Row label="Subtotal sin IVA" value={money(pricing.preIva)} strong />
        <Row label={`IVA ${Math.round(IVA_RATE * 100)}%`} value={money(pricing.iva)} />
        <Divider />
        <Row label="Total" value={money(pricing.total)} accent strong />

        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-crema-100 py-2.5">
            <p className="text-[11px] uppercase text-cacao-500">Utilidad</p>
            <p className={`tabular text-base font-semibold ${pricing.profit >= 0 ? 'text-emerald-700' : 'text-ladrillo-700'}`}>
              {money(pricing.profit)}
            </p>
            <p className="text-[11px] text-cacao-500">{number(pricing.realMarginPct, 1)}% real</p>
          </div>
          <div className="rounded-xl bg-crema-100 py-2.5">
            <p className="text-[11px] uppercase text-cacao-500">Precio por km</p>
            <p className="tabular text-base font-semibold text-cacao-900">
              {distance > 0 ? money(pricing.preIva / distance) : '—'}
            </p>
            <p className="text-[11px] text-cacao-500">{kmLabel(distance)}</p>
          </div>
        </div>
      </Card>

      {pricing.belowCost && (
        <Banner tone="error" title="Estás cotizando por debajo del costo">
          El precio sin IVA ({money(pricing.preIva)}) es menor al costo del viaje ({money(costs.subtotal)}).
        </Banner>
      )}
      {!pricing.belowCost && Number(marginValue) === 0 && !Number(quote.pricing.manualAdjust) && (
        <Banner tone="warn">Sin margen ni ajuste estarías vendiendo al costo.</Banner>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" size="lg" onClick={onBack} className="flex-1">
          Atrás
        </Button>
        <Button size="lg" onClick={onNext} className="flex-[2]" loading={saving}>
          Generar cotización
        </Button>
      </div>
    </div>
  )
}

import { deriveQuote } from '../lib/quoteModel.js'
import { money, dateLabel, km as kmLabel, duration } from '../lib/format.js'
import { IVA_RATE } from '../lib/constants.js'

/**
 * Vista previa de lo que verá el cliente (mismo contenido que el PDF).
 * Se dibuja en claro, como una hoja, aunque la app sea oscura.
 */
export default function QuoteDocument({ quote, settings, mode = quote?.presentation?.mode || 'detallada' }) {
  const { breakdown } = deriveQuote(quote)
  const trip = quote?.trip || {}
  const route = quote?.route || {}
  const origin = trip.origin?.description || '—'
  const destination = trip.destination?.description || '—'
  const originShort = trip.origin?.shortName || origin
  const destinationShort = trip.destination?.shortName || destination
  const validity = Number(settings?.quoteValidityDays) || 0

  return (
    <article className="overflow-hidden rounded-2xl bg-white text-cacao-900 shadow-card">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          {settings?.logoDataUrl ? (
            <img src={settings.logoDataUrl} alt="Logo" className="h-12 w-12 shrink-0 rounded-lg object-contain" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-crema-200 text-[10px] font-semibold text-cacao-500">
              LOGO
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight break-words">
              {settings?.companyName?.trim() || 'Servicio de transporte de carga'}
            </p>
            {settings?.rfc && <p className="text-[11px] text-cacao-500">RFC: {settings.rfc}</p>}
            <p className="text-[11px] text-cacao-500">{quote?.unit || 'Caja seca 53 ft'}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide text-carne-700">Cotización</p>
          <p className="text-sm font-bold">{quote?.folio || 'Sin folio'}</p>
          <p className="text-[11px] text-cacao-500">{dateLabel(quote?.createdAt || new Date().toISOString())}</p>
        </div>
      </div>

      <div className="h-0.5 bg-carne-700" />

      <div className="space-y-1 p-4 text-[13px]">
        {trip.clientName && (
          <p>
            <span className="text-cacao-500">Cliente: </span>
            <span className="font-medium">{trip.clientName}</span>
          </p>
        )}
        <p>
          <span className="text-cacao-500">Origen: </span>
          <span className="font-medium">{origin}</span>
        </p>
        <p>
          <span className="text-cacao-500">Destino: </span>
          <span className="font-medium">{destination}</span>
        </p>
        <p>
          <span className="text-cacao-500">Fecha del viaje: </span>
          <span className="font-medium">{dateLabel(trip.date, { long: true })}</span>
        </p>
        {route.distanceKm > 0 && (
          <p className="tabular">
            <span className="text-cacao-500">Recorrido: </span>
            <span className="font-medium">
              {kmLabel(route.distanceKm)}
              {route.durationMin ? ` · ${duration(route.durationMin)} aprox.` : ''}
            </span>
          </p>
        )}
      </div>

      {quote?.mapImage?.dataUrl && (
        <div className="px-4 pb-4">
          <img src={quote.mapImage.dataUrl} alt="Mapa de la ruta" className="w-full rounded-lg border border-crema-300" />
        </div>
      )}

      <div className="px-4 pb-4">
        {mode === 'global' ? (
          <div className="rounded-lg border border-crema-300">
            <div className="border-b border-crema-300 px-3 py-2.5 text-[13px]">
              Servicio de flete <span className="font-semibold">{originShort}</span> →{' '}
              <span className="font-semibold">{destinationShort}</span>
            </div>
            <div className="flex items-center justify-between bg-carne-700 px-3 py-2.5 text-white">
              <span className="text-sm font-bold">Total + IVA</span>
              <span className="tabular text-base font-bold">{money(breakdown.total)}</span>
            </div>
          </div>
        ) : (
          <table className="w-full overflow-hidden rounded-lg border border-crema-300 text-[13px]">
            <thead>
              <tr className="bg-cacao-900 text-white">
                <th className="px-3 py-2 text-left font-semibold">Concepto</th>
                <th className="px-3 py-2 text-right font-semibold">Monto</th>
              </tr>
            </thead>
            <tbody className="tabular">
              <tr className="border-b border-crema-300">
                <td className="px-3 py-2">Flete</td>
                <td className="px-3 py-2 text-right">{money(breakdown.flete)}</td>
              </tr>
              {breakdown.casetas > 0 && (
                <tr className="border-b border-crema-300">
                  <td className="px-3 py-2">Casetas (TAG)</td>
                  <td className="px-3 py-2 text-right">{money(breakdown.casetas)}</td>
                </tr>
              )}
              {breakdown.resguardo > 0 && (
                <tr className="border-b border-crema-300">
                  <td className="px-3 py-2">
                    Resguardo ({trip.escortDays} día{Number(trip.escortDays) === 1 ? '' : 's'})
                  </td>
                  <td className="px-3 py-2 text-right">{money(breakdown.resguardo)}</td>
                </tr>
              )}
              <tr className="border-b border-crema-300 bg-crema-100 font-semibold">
                <td className="px-3 py-2">Subtotal</td>
                <td className="px-3 py-2 text-right">{money(breakdown.subtotal)}</td>
              </tr>
              <tr className="border-b border-crema-300 bg-crema-100">
                <td className="px-3 py-2">IVA {Math.round(IVA_RATE * 100)}%</td>
                <td className="px-3 py-2 text-right">{money(breakdown.iva)}</td>
              </tr>
              <tr className="bg-carne-700 font-bold text-white">
                <td className="px-3 py-2.5">Total</td>
                <td className="px-3 py-2.5 text-right text-base">{money(breakdown.total)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {quote?.presentation?.notes?.trim() && (
        <div className="px-4 pb-3 text-[12px]">
          <p className="font-semibold">Notas</p>
          <p className="whitespace-pre-line text-cacao-600">{quote.presentation.notes}</p>
        </div>
      )}

      {validity > 0 && (
        <p className="px-4 pb-2 text-[11px] text-cacao-500">
          Vigencia de esta cotización: {validity} día{validity === 1 ? '' : 's'}.
        </p>
      )}

      {settings?.disclaimer?.trim() && (
        <div className="mx-4 mb-4 rounded-lg border border-carne-400 bg-carne-50 px-3 py-2.5 text-[11.5px] leading-relaxed text-cacao-700">
          {settings.disclaimer}
        </div>
      )}
    </article>
  )
}

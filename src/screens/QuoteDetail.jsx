import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppShell from '../components/layout/AppShell.jsx'
import { Banner, Button, Card, Divider, Modal, Row, Segmented, Skeleton } from '../components/ui/index.jsx'
import { PdfIcon, WhatsAppIcon, EditIcon, TrashIcon } from '../components/layout/Icons.jsx'
import QuoteDocument from '../components/QuoteDocument.jsx'
import RouteMap from '../components/RouteMap.jsx'
import { getQuote, deleteQuote, saveQuote } from '../lib/db.js'
import { deriveQuote, routeLabel } from '../lib/quoteModel.js'
import { money, dateLabel, dateTimeLabel, km as kmLabel, duration, number } from '../lib/format.js'
import { QUOTE_MODES, IVA_RATE } from '../lib/constants.js'
import { shareQuotePdf } from '../lib/pdf.js'
import { buildWhatsAppMessage, openWhatsApp } from '../lib/whatsapp.js'
import { useSettings } from '../state/SettingsContext.jsx'
import { useToast } from '../state/ToastContext.jsx'

export default function QuoteDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { settings } = useSettings()
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showInternal, setShowInternal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getQuote(id)
      .then(setQuote)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <AppShell title="Cotización" back="/historial">
        <div className="space-y-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </AppShell>
    )
  }

  if (!quote) {
    return (
      <AppShell title="Cotización" back="/historial">
        <Banner tone="error" title="No encontrada">
          Esta cotización ya no existe en el dispositivo.
        </Banner>
      </AppShell>
    )
  }

  const { costs, pricing } = deriveQuote(quote)
  const mode = quote.presentation?.mode || 'detallada'

  const setMode = async (value) => {
    const next = { ...quote, presentation: { ...quote.presentation, mode: value } }
    setQuote(next)
    try {
      await saveQuote(next, { folioPrefix: settings.folioPrefix })
    } catch {
      /* el cambio de modo es cosmético: no vale la pena interrumpir */
    }
  }

  const exportPdf = async () => {
    setBusy(true)
    try {
      const result = await shareQuotePdf(quote, settings, { mode })
      toast.success(result === 'shared' ? 'PDF compartido.' : 'PDF descargado.')
    } catch (err) {
      toast.error(`No se pudo generar el PDF: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    await deleteQuote(quote.id)
    toast.success(`Cotización ${quote.folio} borrada.`)
    navigate('/historial')
  }

  return (
    <AppShell title={quote.folio} subtitle={routeLabel(quote)} back="/historial">
      <div className="space-y-4">
        {quote.route?.path?.length > 0 || quote.mapImage?.dataUrl ? (
          <RouteMap path={quote.route?.path} fallbackImage={quote.mapImage?.dataUrl} className="h-44" />
        ) : null}

        <Card title="Viaje">
          <div className="space-y-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Origen</p>
              <p className="text-[15px] text-zinc-100">{quote.trip?.origin?.description || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Destino</p>
              <p className="text-[15px] text-zinc-100">{quote.trip?.destination?.description || '—'}</p>
            </div>
          </div>
          <Divider />
          <Row label="Fecha del viaje" value={dateLabel(quote.trip?.date)} />
          <Row label="Distancia" value={quote.route?.distanceKm ? kmLabel(quote.route.distanceKm) : '—'} />
          <Row label="Tiempo estimado" value={quote.route?.durationMin ? duration(quote.route.durationMin) : '—'} />
          <Row label="Preferencia" value={quote.trip?.routePreference === 'rapida' ? 'Rápida' : 'Económica'} />
          {quote.trip?.escortEnabled && (
            <Row label="Resguardo" value={`${quote.trip.escortDays} día(s) × ${money(quote.trip.escortCostPerDay)}`} />
          )}
          <Divider />
          <Row label="Creada" value={dateTimeLabel(quote.createdAt)} />
          {quote.updatedAt && quote.updatedAt !== quote.createdAt && (
            <Row label="Modificada" value={dateTimeLabel(quote.updatedAt)} />
          )}
        </Card>

        <Card
          title="Costos internos"
          subtitle="Solo para ti"
          action={
            <Button variant="ghost" size="sm" onClick={() => setShowInternal((v) => !v)}>
              {showInternal ? 'Ocultar' : 'Mostrar'}
            </Button>
          }
        >
          {showInternal ? (
            <>
              <Row label="Diésel" hint={`${number(costs.liters, 0)} L × ${money(quote.inputs?.dieselPrice)}`} value={money(costs.diesel)} />
              <Row label="Operador" hint={`${money(quote.inputs?.operatorCostPerKm)}/km`} value={money(costs.operator)} />
              <Row label="Casetas (TAG)" value={money(costs.tolls)} />
              {costs.escort > 0 && <Row label="Resguardo" value={money(costs.escort)} />}
              <Divider />
              <Row label="Costo total" value={money(costs.subtotal)} strong />
              <Row label={`Margen (${number(pricing.realMarginPct, 1)}%)`} value={money(pricing.profit)} />
              <Row label="Subtotal sin IVA" value={money(pricing.preIva)} strong />
              <Row label={`IVA ${Math.round(IVA_RATE * 100)}%`} value={money(pricing.iva)} />
              <Row label="Total" value={money(pricing.total)} accent strong />
            </>
          ) : (
            <p className="text-sm text-zinc-500">Oculto para que puedas mostrar la pantalla sin revelar tus costos.</p>
          )}
        </Card>

        <Card title="Modo de cotización">
          <Segmented options={QUOTE_MODES} value={mode} onChange={setMode} />
        </Card>

        <QuoteDocument quote={quote} settings={settings} mode={mode} />

        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" onClick={exportPdf} loading={busy}>
            <PdfIcon className="h-5 w-5" /> PDF
          </Button>
          <Button size="lg" variant="success" onClick={() => openWhatsApp(buildWhatsAppMessage(quote, settings, mode))}>
            <WhatsAppIcon className="h-5 w-5" /> WhatsApp
          </Button>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => navigate(`/nueva?edit=${quote.id}`)}>
            <EditIcon className="h-5 w-5" /> Editar
          </Button>
          <Button variant="ghost" className="flex-1 text-red-400" onClick={() => setConfirmDelete(true)}>
            <TrashIcon className="h-5 w-5" /> Borrar
          </Button>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Borrar cotización?"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" className="flex-1" onClick={remove}>
              Borrar
            </Button>
          </>
        }
      >
        Se eliminará {quote.folio} de este dispositivo. No se puede deshacer.
      </Modal>
    </AppShell>
  )
}

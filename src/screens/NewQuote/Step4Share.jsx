import { useState } from 'react'
import { Button, Card, Segmented, TextArea, Banner } from '../../components/ui/index.jsx'
import { PdfIcon, WhatsAppIcon, CheckIcon } from '../../components/layout/Icons.jsx'
import QuoteDocument from '../../components/QuoteDocument.jsx'
import { QUOTE_MODES } from '../../lib/constants.js'
import { shareQuotePdf } from '../../lib/pdf.js'
import { buildWhatsAppMessage, openWhatsApp } from '../../lib/whatsapp.js'
import { useToast } from '../../state/ToastContext.jsx'

export default function Step4Share({ quote, settings, patchPresentation, onBack, onNewQuote, onGoHistory }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const mode = quote.presentation?.mode || 'detallada'

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

  const sendWhatsApp = () => {
    try {
      openWhatsApp(buildWhatsAppMessage(quote, settings, mode))
    } catch (err) {
      toast.error(`No se pudo abrir WhatsApp: ${err.message}`)
    }
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(buildWhatsAppMessage(quote, settings, mode))
      toast.success('Texto de la cotización copiado.')
    } catch {
      toast.error('El navegador no permitió copiar el texto.')
    }
  }

  return (
    <div className="space-y-4">
      <Banner tone="success" title={`Cotización ${quote.folio} guardada`}>
        Ya aparece en tu historial. Puedes seguir ajustando cómo se comparte.
      </Banner>

      <Card title="Modo de cotización">
        <Segmented options={QUOTE_MODES} value={mode} onChange={(v) => patchPresentation({ mode: v })} />
      </Card>

      <QuoteDocument quote={quote} settings={settings} mode={mode} />

      <Card title="Notas para el cliente" subtitle="Opcional: aparecen en el PDF y el mensaje">
        <TextArea
          placeholder="Ej. Se requiere confirmación con 24 h de anticipación."
          value={quote.presentation?.notes || ''}
          onChange={(e) => patchPresentation({ notes: e.target.value })}
        />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" onClick={exportPdf} loading={busy}>
          <PdfIcon className="h-5 w-5" /> PDF
        </Button>
        <Button size="lg" variant="success" onClick={sendWhatsApp}>
          <WhatsAppIcon className="h-5 w-5" /> WhatsApp
        </Button>
      </div>

      <Button variant="secondary" full onClick={copyText}>
        Copiar texto de la cotización
      </Button>

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" className="flex-1" onClick={onBack}>
          Ajustar margen
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onGoHistory}>
          Ver historial
        </Button>
      </div>

      <Button size="lg" full onClick={onNewQuote}>
        <CheckIcon className="h-5 w-5" /> Nueva cotización
      </Button>
    </div>
  )
}

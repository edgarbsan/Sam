import { useEffect, useRef, useState } from 'react'
import AppShell from '../components/layout/AppShell.jsx'
import { Banner, Button, Card, Divider, Field, Modal, NumberInput, Segmented, TextArea, TextInput } from '../components/ui/index.jsx'
import { RefreshIcon, TrashIcon } from '../components/layout/Icons.jsx'
import { useSettings } from '../state/SettingsContext.jsx'
import { useToast } from '../state/ToastContext.jsx'
import { fetchDieselPrice, isDieselStale, dieselSourceLabel, CRE_DATASET_URL } from '../lib/diesel.js'
import { loadMaps, fetchSuggestions } from '../lib/maps.js'
import { clearAllQuotes, exportBackup, peekFolioCounter } from '../lib/db.js'
import { DEFAULT_DISCLAIMER, QUOTE_MODES } from '../lib/constants.js'
import { dateLabel } from '../lib/format.js'

/** Reescala el logo a 400 px máximo y lo guarda como PNG en base64. */
function readLogo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'))
      img.onload = () => {
        const max = 400
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function SettingsScreen() {
  const { settings, updateSettings, apiKey, updateApiKey, ready } = useSettings()
  const toast = useToast()
  const [form, setForm] = useState(settings)
  const [keyDraft, setKeyDraft] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [status, setStatus] = useState('')
  const [dieselBusy, setDieselBusy] = useState(false)
  const [testBusy, setTestBusy] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [folioCount, setFolioCount] = useState(0)
  const fileRef = useRef(null)
  const seeded = useRef(false)
  const timer = useRef(null)
  const formRef = useRef(settings)
  const dirtyRef = useRef(false)

  useEffect(() => {
    if (!ready || seeded.current) return
    seeded.current = true
    setForm(settings)
    setKeyDraft(apiKey)
    peekFolioCounter().then(setFolioCount)
  }, [ready, settings, apiKey])

  // Guardado automático con rebote: no hay botón "guardar" que se olvide.
  const patch = (changes) => {
    const next = { ...form, ...changes }
    setForm(next)
    formRef.current = next
    dirtyRef.current = true
    setStatus('Guardando…')
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      await updateSettings(next) // saveSettings normaliza los campos numéricos
      dirtyRef.current = false
      setStatus('Guardado ✓')
      setTimeout(() => setStatus(''), 1800)
    }, 500)
  }

  // Si el usuario sale de la pantalla antes del rebote, se guarda de todos modos.
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      if (dirtyRef.current) updateSettings(formRef.current)
    },
    [updateSettings],
  )

  const saveApiKey = (value) => {
    setKeyDraft(value)
    updateApiKey(value)
  }

  const updateDiesel = async () => {
    setDieselBusy(true)
    try {
      const result = await fetchDieselPrice({ corsProxy: form.corsProxy })
      patch({ dieselPrice: result.price, dieselPriceDate: result.date, dieselPriceSource: 'cre' })
      toast.success(`Diésel actualizado a $${result.price} (${result.sampleSize} estaciones).`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDieselBusy(false)
    }
  }

  const testApiKey = async () => {
    setTestBusy(true)
    try {
      await loadMaps(keyDraft)
      const results = await fetchSuggestions(keyDraft, 'Guadalajara, Jalisco')
      toast.success(results.length ? 'API Key funcionando: Maps y Places responden.' : 'Maps cargó, pero Places no devolvió sugerencias.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setTestBusy(false)
    }
  }

  const pickLogo = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      patch({ logoDataUrl: await readLogo(file) })
      toast.success('Logo actualizado.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      event.target.value = ''
    }
  }

  const downloadBackup = async () => {
    try {
      const data = await exportBackup()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `respaldo-cotizador-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Respaldo descargado.')
    } catch (err) {
      toast.error(`No se pudo generar el respaldo: ${err.message}`)
    }
  }

  const stale = isDieselStale(form.dieselPriceDate)

  return (
    <AppShell title="Ajustes" subtitle={status || 'Se guardan solos en este dispositivo'}>
      <div className="space-y-4">
        <Card title="Empresa">
          <div className="space-y-3">
            <Field label="Nombre / razón social">
              <TextInput
                placeholder="Transportes del Bajío S.A. de C.V."
                value={form.companyName || ''}
                onChange={(e) => patch({ companyName: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="RFC">
                <TextInput
                  placeholder="XAXX010101000"
                  value={form.rfc || ''}
                  onChange={(e) => patch({ rfc: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Teléfono">
                <TextInput
                  inputMode="tel"
                  placeholder="33 1234 5678"
                  value={form.phone || ''}
                  onChange={(e) => patch({ phone: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Correo" hint="Aparece en el PDF">
              <TextInput
                inputMode="email"
                placeholder="ventas@empresa.com"
                value={form.email || ''}
                onChange={(e) => patch({ email: e.target.value })}
              />
            </Field>

            <Field label="Logo">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-700 bg-ink-850">
                  {form.logoDataUrl ? (
                    <img src={form.logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-zinc-500">Sin logo</span>
                  )}
                </div>
                <div className="flex flex-1 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                    {form.logoDataUrl ? 'Cambiar' : 'Subir'}
                  </Button>
                  {form.logoDataUrl && (
                    <Button variant="ghost" size="sm" onClick={() => patch({ logoDataUrl: null })}>
                      Quitar
                    </Button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickLogo} />
              </div>
            </Field>
          </div>
        </Card>

        <Card title="Google Maps">
          <Field
            label="API Key"
            hint="Se guarda solo en este teléfono (localStorage). Requiere Maps JavaScript API, Places API y Routes API."
          >
            <div className="flex gap-2">
              <TextInput
                type={showKey ? 'text' : 'password'}
                placeholder="AIza…"
                autoComplete="off"
                value={keyDraft}
                onChange={(e) => saveApiKey(e.target.value)}
              />
              <Button variant="secondary" size="md" className="shrink-0" onClick={() => setShowKey((v) => !v)}>
                {showKey ? 'Ocultar' : 'Ver'}
              </Button>
            </div>
          </Field>
          <Button variant="secondary" full className="mt-3" onClick={testApiKey} loading={testBusy} disabled={!keyDraft}>
            Probar conexión
          </Button>
          {!keyDraft && (
            <Banner tone="warn" className="mt-3">
              Sin API Key puedes capturar kilómetros a mano, pero no habrá autocompletado, ruta ni casetas automáticas.
            </Banner>
          )}
        </Card>

        <Card title="Costos operativos">
          <Field
            label="Precio del diésel"
            hint={`${dieselSourceLabel(form)} · ${form.dieselPriceDate ? dateLabel(form.dieselPriceDate) : 'sin fecha'}`}
          >
            <NumberInput
              value={String(form.dieselPrice ?? '')}
              onChange={(v) => patch({ dieselPrice: v, dieselPriceDate: new Date().toISOString(), dieselPriceSource: 'manual' })}
              prefix="$"
              suffix="/L"
              min={0}
            />
          </Field>
          <Button variant="secondary" full className="mt-3" onClick={updateDiesel} loading={dieselBusy}>
            <RefreshIcon className="h-5 w-5" /> Actualizar desde CRE
          </Button>
          {stale && (
            <Banner tone="warn" className="mt-3">
              El precio tiene más de una semana. Actualízalo desde la CRE o captúralo a mano.
            </Banner>
          )}
          <p className="hint-base">
            Datos abiertos:{' '}
            <a href={CRE_DATASET_URL} target="_blank" rel="noreferrer" className="text-brand-400 underline">
              precios de gasolina y diésel (datos.gob.mx)
            </a>
            . Si el navegador bloquea la consulta, captura el precio a mano.
          </p>

          <Divider className="my-4" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Operador por km">
              <NumberInput
                value={String(form.operatorCostPerKm ?? '')}
                onChange={(v) => patch({ operatorCostPerKm: v })}
                prefix="$"
                min={0}
              />
            </Field>
            <Field label="Rendimiento">
              <NumberInput
                value={String(form.truckEfficiency ?? '')}
                onChange={(v) => patch({ truckEfficiency: v })}
                suffix="km/L"
                min={0.1}
              />
            </Field>
            <Field label="Resguardo por día">
              <NumberInput
                value={String(form.escortCostPerDay ?? '')}
                onChange={(v) => patch({ escortCostPerDay: v })}
                prefix="$"
                min={0}
              />
            </Field>
            <Field label="Casetas por km" hint="Estimación de respaldo">
              <NumberInput
                value={String(form.tollPerKmFallback ?? '')}
                onChange={(v) => patch({ tollPerKmFallback: v })}
                prefix="$"
                min={0}
              />
            </Field>
          </div>
          <Field
            label="Factor de ejes para casetas"
            hint="Google cotiza casetas de automóvil; este factor las lleva a tarifa de trailer (T3-S2)."
            className="mt-3"
          >
            <NumberInput
              value={String(form.tollAxleMultiplier ?? '')}
              onChange={(v) => patch({ tollAxleMultiplier: v })}
              suffix="×"
              min={1}
            />
          </Field>
        </Card>

        <Card title="Cotización">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prefijo de folio" hint={`Siguiente: ${folioCount + 1}`}>
              <TextInput
                value={form.folioPrefix || ''}
                onChange={(e) => patch({ folioPrefix: e.target.value.toUpperCase().slice(0, 6) })}
              />
            </Field>
            <Field label="Vigencia">
              <NumberInput
                value={String(form.quoteValidityDays ?? '')}
                onChange={(v) => patch({ quoteValidityDays: v })}
                suffix="días"
                inputMode="numeric"
                step="1"
                min={0}
              />
            </Field>
          </div>
          <Field label="Modo por defecto" className="mt-3">
            <Segmented options={QUOTE_MODES} value={form.defaultQuoteMode} onChange={(v) => patch({ defaultQuoteMode: v })} />
          </Field>
          <Field
            label="Leyenda al pie"
            className="mt-3"
            hint="Aparece siempre en el PDF y en el mensaje de WhatsApp."
          >
            <TextArea rows={5} value={form.disclaimer || ''} onChange={(e) => patch({ disclaimer: e.target.value })} />
          </Field>
          {form.disclaimer !== DEFAULT_DISCLAIMER && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => patch({ disclaimer: DEFAULT_DISCLAIMER })}>
              Restaurar leyenda original
            </Button>
          )}
        </Card>

        <Card title="Avanzado">
          <Field
            label="Proxy CORS (opcional)"
            hint="Solo si la consulta del diésel falla por CORS. Ejemplo: https://mi-proxy.com/?url="
          >
            <TextInput
              placeholder="https://…/?url="
              value={form.corsProxy || ''}
              onChange={(e) => patch({ corsProxy: e.target.value.trim() })}
            />
          </Field>
          <Divider className="my-4" />
          <Button variant="secondary" full onClick={downloadBackup}>
            Descargar respaldo (JSON)
          </Button>
          <Button variant="ghost" full className="mt-2 text-red-400" onClick={() => setConfirmClear(true)}>
            <TrashIcon className="h-5 w-5" /> Borrar todo el historial
          </Button>
        </Card>

        <p className="pb-2 text-center text-xs text-zinc-600">
          Cotizador de fletes · Caja seca 53 ft · Los datos viven en este dispositivo.
        </p>
      </div>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="¿Borrar todo el historial?"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmClear(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                await clearAllQuotes()
                setConfirmClear(false)
                toast.success('Historial borrado.')
              }}
            >
              Borrar todo
            </Button>
          </>
        }
      >
        Se eliminarán todas las cotizaciones guardadas. Tus ajustes y el consecutivo de folios se conservan.
        Descarga un respaldo antes si quieres conservarlas.
      </Modal>
    </AppShell>
  )
}

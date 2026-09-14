import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell.jsx'
import { Button, EmptyState, Modal, Skeleton, TextInput } from '../components/ui/index.jsx'
import { SearchIcon, TrashIcon, EditIcon, PlusIcon } from '../components/layout/Icons.jsx'
import { listQuotes, deleteQuote, searchQuotes } from '../lib/db.js'
import { deriveQuote, routeLabel } from '../lib/quoteModel.js'
import { money, dateLabel, km as kmLabel } from '../lib/format.js'
import { useToast } from '../state/ToastContext.jsx'

function QuoteRow({ quote, onOpen, onEdit, onDelete }) {
  const { pricing } = deriveQuote(quote)
  return (
    <li className="card overflow-hidden">
      <button type="button" onClick={onOpen} className="w-full px-4 py-3 text-left active:bg-ink-850">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-semibold tracking-wide text-brand-400">{quote.folio}</span>
          <span className="text-xs text-zinc-500">{dateLabel(quote.trip?.date)}</span>
        </div>
        <p className="mt-1 truncate text-[15px] font-medium text-zinc-100">{routeLabel(quote)}</p>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500 tabular">
            {quote.route?.distanceKm ? kmLabel(quote.route.distanceKm) : 'Sin ruta'}
            {quote.trip?.escortEnabled ? ' · con resguardo' : ''}
          </span>
          <span className="tabular text-base font-bold text-zinc-100">{money(pricing.total)}</span>
        </div>
      </button>
      <div className="flex border-t border-ink-800 text-xs">
        <button onClick={onOpen} className="flex-1 py-2.5 text-zinc-300 hover:bg-ink-800">
          Ver detalle
        </button>
        <button onClick={onEdit} className="flex flex-1 items-center justify-center gap-1.5 border-l border-ink-800 py-2.5 text-zinc-300 hover:bg-ink-800">
          <EditIcon className="h-4 w-4" /> Editar
        </button>
        <button onClick={onDelete} className="flex flex-1 items-center justify-center gap-1.5 border-l border-ink-800 py-2.5 text-red-400 hover:bg-red-500/10">
          <TrashIcon className="h-4 w-4" /> Borrar
        </button>
      </div>
    </li>
  )
}

export default function HistoryScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [term, setTerm] = useState('')
  const [pending, setPending] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setQuotes(await listQuotes())
    } catch (err) {
      toast.error(`No se pudo leer el historial: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filtered = useMemo(() => searchQuotes(quotes, term), [quotes, term])
  const totalMonth = useMemo(() => {
    const now = new Date()
    return quotes
      .filter((q) => {
        const d = new Date(q.createdAt)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((sum, q) => sum + deriveQuote(q).pricing.total, 0)
  }, [quotes])

  const confirmDelete = async () => {
    try {
      await deleteQuote(pending.id)
      setPending(null)
      toast.success(`Cotización ${pending.folio} borrada.`)
      refresh()
    } catch (err) {
      toast.error(`No se pudo borrar: ${err.message}`)
    }
  }

  return (
    <AppShell
      title="Historial"
      subtitle={
        quotes.length
          ? `${quotes.length} ${quotes.length === 1 ? 'cotización' : 'cotizaciones'} · ${money(totalMonth, { decimals: 0 })} este mes`
          : 'Guardadas en este dispositivo'
      }
      action={
        <Button size="sm" onClick={() => navigate('/nueva')}>
          <PlusIcon className="h-4 w-4" /> Nueva
        </Button>
      }
    >
      <div className="relative mb-4">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
        <TextInput
          className="pl-11"
          placeholder="Buscar por folio, origen o destino"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          inputMode="search"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : !quotes.length ? (
        <EmptyState
          icon="🚛"
          title="Todavía no hay cotizaciones"
          action={
            <Button onClick={() => navigate('/nueva')}>
              <PlusIcon className="h-5 w-5" /> Crear la primera
            </Button>
          }
        >
          Las cotizaciones que generes se guardan aquí, en el teléfono, y se pueden consultar sin internet.
        </EmptyState>
      ) : !filtered.length ? (
        <EmptyState icon="🔍" title="Sin resultados">
          No hay cotizaciones que coincidan con “{term}”.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {filtered.map((quote) => (
            <QuoteRow
              key={quote.id}
              quote={quote}
              onOpen={() => navigate(`/historial/${quote.id}`)}
              onEdit={() => navigate(`/nueva?edit=${quote.id}`)}
              onDelete={() => setPending(quote)}
            />
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="¿Borrar cotización?"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button variant="danger" className="flex-1" onClick={confirmDelete}>
              Borrar
            </Button>
          </>
        }
      >
        Se eliminará {pending?.folio} ({routeLabel(pending || {})}) de este dispositivo. No se puede deshacer.
      </Modal>
    </AppShell>
  )
}

// Generación del PDF en el cliente con jsPDF (sin servidor).
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { moneyPlain, dateLabel, km, duration, dateTimeLabel } from './format.js'
import { deriveQuote } from './quoteModel.js'
import { IVA_RATE } from './constants.js'

const ORANGE = [255, 129, 18]
const INK = [24, 24, 27]
const MUTED = [113, 113, 122]
const LINE = [228, 228, 231]

const M = 14 // margen en mm
const PAGE_W = 210
const CONTENT_W = PAGE_W - M * 2

function header(doc, quote, settings) {
  let y = M

  // Logo (opcional)
  let textX = M
  if (settings?.logoDataUrl) {
    try {
      doc.addImage(settings.logoDataUrl, 'PNG', M, y, 22, 22, undefined, 'FAST')
      textX = M + 27
    } catch {
      /* logo inválido: se ignora */
    }
  }

  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(settings?.companyName?.trim() || 'Servicio de transporte de carga', textX, y + 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  const meta = []
  if (settings?.rfc) meta.push(`RFC: ${settings.rfc}`)
  if (settings?.phone) meta.push(`Tel: ${settings.phone}`)
  if (settings?.email) meta.push(settings.email)
  if (meta.length) doc.text(meta.join('   ·   '), textX, y + 13)
  doc.text(quote?.unit || 'Caja seca 53 ft', textX, y + 18)

  // Bloque de folio a la derecha
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...ORANGE)
  doc.text('COTIZACIÓN', PAGE_W - M, y + 6, { align: 'right' })
  doc.setTextColor(...INK)
  doc.setFontSize(13)
  doc.text(quote?.folio || 'SIN FOLIO', PAGE_W - M, y + 13, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(dateLabel(quote?.createdAt || new Date().toISOString(), { long: true }), PAGE_W - M, y + 18, { align: 'right' })

  y += 25
  doc.setDrawColor(...ORANGE)
  doc.setLineWidth(0.8)
  doc.line(M, y, PAGE_W - M, y)
  return y + 7
}

function infoGrid(doc, quote, y) {
  const trip = quote?.trip || {}
  const route = quote?.route || {}
  const rows = [
    ['Origen', trip.origin?.description || '—'],
    ['Destino', trip.destination?.description || '—'],
    ['Fecha del viaje', dateLabel(trip.date, { long: true })],
    ['Distancia', route.distanceKm ? km(route.distanceKm) : '—'],
    ['Tiempo estimado', route.durationMin ? duration(route.durationMin) : '—'],
    ['Ruta', route.avoidTolls ? 'Libre (sin casetas)' : trip.routePreference === 'rapida' ? 'Rápida' : 'Económica'],
  ]
  if (trip.clientName) rows.unshift(['Cliente', trip.clientName])
  if (trip.escortEnabled) rows.push(['Resguardo', `${trip.escortDays} día(s)`])

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9.5, cellPadding: { top: 1.2, bottom: 1.2, left: 0, right: 2 }, textColor: INK },
    columnStyles: {
      0: { cellWidth: 34, textColor: MUTED, fontStyle: 'bold' },
      1: { cellWidth: CONTENT_W - 34 },
    },
    body: rows,
  })
  return doc.lastAutoTable.finalY + 5
}

function mapBlock(doc, quote, y) {
  const dataUrl = quote?.mapImage?.dataUrl
  if (!dataUrl) return y
  const w = CONTENT_W
  const h = w / 2 // las imágenes se generan 2:1
  if (y + h > 250) {
    doc.addPage()
    y = M
  }
  try {
    doc.addImage(dataUrl, 'JPEG', M, y, w, h, undefined, 'FAST')
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.3)
    doc.rect(M, y, w, h)
    return y + h + 6
  } catch {
    return y
  }
}

function conceptsTable(doc, quote, mode, y) {
  const { breakdown } = deriveQuote(quote)
  const trip = quote?.trip || {}
  const body = []

  if (mode === 'global') {
    const o = trip.origin?.shortName || trip.origin?.description || ''
    const d = trip.destination?.shortName || trip.destination?.description || ''
    body.push([`Servicio de flete ${o} → ${d}`, moneyPlain(breakdown.subtotal)])
  } else {
    body.push(['Flete', moneyPlain(breakdown.flete)])
    if (breakdown.casetas > 0) body.push(['Casetas (TAG)', moneyPlain(breakdown.casetas)])
    if (breakdown.resguardo > 0) {
      body.push([`Resguardo (${trip.escortDays} día${trip.escortDays === 1 ? '' : 's'})`, moneyPlain(breakdown.resguardo)])
    }
  }

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    head: [['Concepto', 'Monto MXN']],
    body,
    foot: [
      ['Subtotal', moneyPlain(breakdown.subtotal)],
      [`IVA ${Math.round(IVA_RATE * 100)}%`, moneyPlain(breakdown.iva)],
      ['TOTAL', moneyPlain(breakdown.total)],
    ],
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 2.4, lineColor: LINE, lineWidth: 0.2, textColor: INK },
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: [250, 250, 250], textColor: INK, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: CONTENT_W - 45 }, 1: { cellWidth: 45, halign: 'right' } },
    didParseCell: (data) => {
      if (data.section === 'foot' && data.row.index === 2) {
        data.cell.styles.fillColor = ORANGE
        data.cell.styles.textColor = [255, 255, 255]
        data.cell.styles.fontSize = 11.5
      }
    },
  })
  return doc.lastAutoTable.finalY + 6
}

function notesBlock(doc, quote, settings, y) {
  const notes = quote?.presentation?.notes?.trim()
  const disclaimer = settings?.disclaimer?.trim()
  const validity = Number(settings?.quoteValidityDays) || 0

  if (notes) {
    if (y > 250) {
      doc.addPage()
      y = M
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK)
    doc.text('Notas', M, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    const lines = doc.splitTextToSize(notes, CONTENT_W)
    doc.text(lines, M, y + 9)
    y += 9 + lines.length * 4.2
  }

  if (validity > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text(`Vigencia de esta cotización: ${validity} día${validity === 1 ? '' : 's'}.`, M, y + 5)
    y += 8
  }

  if (disclaimer) {
    const lines = doc.splitTextToSize(disclaimer, CONTENT_W - 8)
    const boxH = lines.length * 4.2 + 8
    if (y + boxH > 280) {
      doc.addPage()
      y = M
    }
    doc.setFillColor(253, 246, 238)
    doc.setDrawColor(...ORANGE)
    doc.setLineWidth(0.4)
    doc.roundedRect(M, y, CONTENT_W, boxH, 2, 2, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.8)
    doc.setTextColor(...INK)
    doc.text(lines, M + 4, y + 6)
    y += boxH + 4
  }
  return y
}

function footer(doc) {
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(`Generada el ${dateTimeLabel(new Date().toISOString())}`, M, 291)
    doc.text(`Página ${i} de ${pages}`, PAGE_W - M, 291, { align: 'right' })
  }
}

/** Construye el documento completo y devuelve la instancia de jsPDF. */
export function buildQuotePdf(quote, settings, { mode = quote?.presentation?.mode || 'detallada' } = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  let y = header(doc, quote, settings)
  y = infoGrid(doc, quote, y)
  y = mapBlock(doc, quote, y)
  y = conceptsTable(doc, quote, mode, y)
  notesBlock(doc, quote, settings, y)
  footer(doc)
  return doc
}

export function pdfFileName(quote) {
  const clean = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24)
  const o = clean(quote?.trip?.origin?.shortName || quote?.trip?.origin?.description)
  const d = clean(quote?.trip?.destination?.shortName || quote?.trip?.destination?.description)
  return `${quote?.folio || 'cotizacion'}${o ? `-${o}` : ''}${d ? `-${d}` : ''}.pdf`.toLowerCase()
}

export function downloadQuotePdf(quote, settings, options) {
  const doc = buildQuotePdf(quote, settings, options)
  doc.save(pdfFileName(quote))
}

/**
 * Comparte el PDF con el menú nativo del celular (WhatsApp, correo, etc.).
 * Si el dispositivo no soporta compartir archivos, lo descarga.
 * @returns {Promise<'shared'|'downloaded'>}
 */
export async function shareQuotePdf(quote, settings, options) {
  const doc = buildQuotePdf(quote, settings, options)
  const name = pdfFileName(quote)
  const blob = doc.output('blob')
  const file = new File([blob], name, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: quote?.folio || 'Cotización',
        text: `Cotización ${quote?.folio || ''}`.trim(),
      })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'shared'
    }
  }
  doc.save(name)
  return 'downloaded'
}

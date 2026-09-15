// Mensaje preformateado para WhatsApp (esquema wa.me).
import { money, km, duration, dateLabel } from './format.js'
import { deriveQuote, routeLabel } from './quoteModel.js'
import { buildDirectionsLink } from './maps.js'

/**
 * Arma el texto de la cotización según el modo elegido.
 * @param {object} quote
 * @param {object} settings
 * @param {'detallada'|'global'} [mode]
 */
export function buildWhatsAppMessage(quote, settings, mode = quote?.presentation?.mode || 'detallada') {
  const { breakdown } = deriveQuote(quote)
  const origin = quote?.trip?.origin
  const destination = quote?.trip?.destination
  const lines = []

  const company = settings?.companyName?.trim()
  if (company) lines.push(`*${company.toUpperCase()}*`)
  lines.push(`*COTIZACIÓN ${quote?.folio || ''}*`.trim())
  lines.push('')
  lines.push(`📍 *Origen:* ${origin?.description || '—'}`)
  lines.push(`🏁 *Destino:* ${destination?.description || '—'}`)
  lines.push(`📅 *Fecha del viaje:* ${dateLabel(quote?.trip?.date)}`)
  lines.push(`🚛 *Unidad:* ${quote?.unit || 'Caja seca 53 ft'}`)
  if (quote?.route?.distanceKm) {
    lines.push(`🛣️ *Recorrido:* ${km(quote.route.distanceKm)} · ${duration(quote.route.durationMin)} aprox.`)
  }
  lines.push('')

  if (mode === 'global') {
    lines.push(`*Servicio de flete ${origin?.shortName || origin?.description || ''} → ${destination?.shortName || destination?.description || ''}*`)
    lines.push(`*Total + IVA: ${money(breakdown.total)}*`)
  } else {
    lines.push('*DESGLOSE*')
    lines.push(`• Flete: ${money(breakdown.flete)}`)
    if (breakdown.casetas > 0) lines.push(`• Casetas (TAG): ${money(breakdown.casetas)}`)
    if (breakdown.resguardo > 0) lines.push(`• Resguardo: ${money(breakdown.resguardo)}`)
    lines.push(`• Subtotal: ${money(breakdown.subtotal)}`)
    lines.push(`• IVA 16%: ${money(breakdown.iva)}`)
    lines.push(`*• TOTAL: ${money(breakdown.total)}*`)
  }

  const link = origin && destination ? buildDirectionsLink({ origin, destination, avoidTolls: quote?.route?.avoidTolls }) : null
  if (link) {
    lines.push('')
    lines.push(`🗺️ Ruta: ${link}`)
  }

  const validity = Number(settings?.quoteValidityDays) || 0
  if (validity > 0) {
    lines.push('')
    lines.push(`_Vigencia de la cotización: ${validity} día${validity === 1 ? '' : 's'}._`)
  }

  const disclaimer = settings?.disclaimer?.trim()
  if (disclaimer) {
    lines.push('')
    lines.push(`_${disclaimer}_`)
  }

  if (settings?.phone) {
    lines.push('')
    lines.push(`📞 ${settings.phone}`)
  }

  return lines.join('\n')
}

export function whatsappUrl(text, phone = '') {
  const digits = String(phone || '').replace(/\D/g, '')
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(text)}`
}

export function openWhatsApp(text, phone = '') {
  window.open(whatsappUrl(text, phone), '_blank', 'noopener,noreferrer')
}

// Genera los iconos PNG de la PWA sin dependencias externas.
// Dibuja un trailer estilizado (caja + tractor) en naranja sobre fondo oscuro.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

const BG = [10, 10, 11]
const BG_MASKABLE = [18, 18, 20]
const ORANGE = [255, 129, 18]
const AMBER = [255, 193, 113]
const DARK = [12, 12, 14]

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = c ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function draw(size, { maskable = false } = {}) {
  const px = Buffer.alloc(size * size * 4)
  const set = (x, y, [r, g, b], a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    const sa = a / 255
    px[i] = Math.round(px[i] * (1 - sa) + r * sa)
    px[i + 1] = Math.round(px[i + 1] * (1 - sa) + g * sa)
    px[i + 2] = Math.round(px[i + 2] * (1 - sa) + b * sa)
    px[i + 3] = 255
  }
  const rect = (x, y, w, h, color, radius = 0) => {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) {
        if (radius > 0) {
          const dx = Math.min(i - x, x + w - 1 - i)
          const dy = Math.min(j - y, y + h - 1 - j)
          if (dx < radius && dy < radius) {
            const d = Math.hypot(radius - dx, radius - dy)
            if (d > radius) continue
          }
        }
        set(i, j, color)
      }
    }
  }
  const disc = (cx, cy, r, color) => {
    for (let j = Math.floor(cy - r); j <= cy + r; j++)
      for (let i = Math.floor(cx - r); i <= cx + r; i++)
        if (Math.hypot(i - cx, j - cy) <= r) set(i, j, color)
  }

  // Fondo
  rect(0, 0, size, size, maskable ? BG_MASKABLE : BG, maskable ? 0 : Math.round(size * 0.22))

  // El dibujo vive en el 60% central para que el recorte maskable no lo corte.
  const s = size / 512
  const inset = maskable ? size * 0.2 : size * 0.1
  const W = size - inset * 2
  const u = W / 512 // unidad de dibujo

  const x0 = inset
  const y0 = inset + W * 0.16

  // Caja seca de 53 pies
  rect(Math.round(x0 + 20 * u), Math.round(y0 + 90 * u), Math.round(300 * u), Math.round(180 * u), ORANGE, Math.round(14 * u))
  // Líneas de la caja
  rect(Math.round(x0 + 50 * u), Math.round(y0 + 130 * u), Math.round(240 * u), Math.round(10 * u), DARK)
  rect(Math.round(x0 + 50 * u), Math.round(y0 + 170 * u), Math.round(240 * u), Math.round(10 * u), DARK)

  // Tractor
  rect(Math.round(x0 + 330 * u), Math.round(y0 + 150 * u), Math.round(140 * u), Math.round(120 * u), AMBER, Math.round(12 * u))
  rect(Math.round(x0 + 350 * u), Math.round(y0 + 170 * u), Math.round(95 * u), Math.round(55 * u), DARK, Math.round(8 * u))

  // Chasis
  rect(Math.round(x0 + 20 * u), Math.round(y0 + 270 * u), Math.round(450 * u), Math.round(18 * u), ORANGE)

  // Llantas
  const wy = y0 + 300 * u
  for (const wx of [80, 165, 370, 450]) {
    disc(x0 + wx * u, wy, 36 * u, AMBER)
    disc(x0 + wx * u, wy, 16 * u, DARK)
  }
  void s
  return px
}

const sizes = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, {}],
]
for (const [name, size, opts] of sizes) {
  writeFileSync(resolve(OUT, name), png(size, draw(size, opts)))
  console.log('✓', name, size + 'px')
}

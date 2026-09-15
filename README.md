# Cotizador de Fletes — Caja seca 53 ft

PWA móvil para cotizar fletes de un trailer de caja seca de 53 pies. Corre
completamente en el navegador: **sin backend**, sin cuentas y sin base de datos
remota. Las cotizaciones se guardan en el propio teléfono (IndexedDB) y el
historial se consulta aun sin internet.

<p align="center">
  <em>Nueva cotización (wizard de 4 pasos) · Historial · Ajustes</em>
</p>

## Qué hace

| Paso | Pantalla | Qué resuelve |
| --- | --- | --- |
| 1 | **Viaje** | Origen y destino con autocompletado de Google, fecha, resguardo (días × costo) y preferencia de ruta: 🟢 económica o 🔵 rápida. |
| 2 | **Costos** | Kilómetros y tiempo desde Google, casetas con tarifa TAG, diésel, operador y resguardo. Todo editable para ese viaje. |
| 3 | **Margen** | Costo interno (solo para el dueño), margen % sin valor por defecto, ajuste manual en pesos y precio de venta en vivo con IVA. |
| 4 | **Compartir** | Vista previa tal como la verá el cliente, en modo **detallado** o **global**, PDF y WhatsApp. |

Además: historial con buscador, edición que recalcula todo, borrado, y una
pantalla de ajustes con los datos de la empresa y los parámetros de costo.

## Cómo se calcula

```
Diésel     = (km ÷ rendimiento) × precio del diésel      (rendimiento default: 2 km/L)
Operador   = km × costo por km                           (default: $3.00)
Casetas    = Routes API con pase TAG/IAVE × factor de ejes
             (si no hay dato: km × costo por km de caseta)
Resguardo  = días × costo por día                        (default: $100)

Costo interno = diésel + operador + casetas + resguardo
Subtotal sin IVA = costo interno × (1 + margen %) + ajuste manual
Total = subtotal + IVA 16%
```

En la cotización **detallada** el cliente ve casetas y resguardo a costo; el
margen viaja dentro del renglón de *Flete*. En la **global** solo ve un total.
Ambas llevan siempre al pie la leyenda de maniobras y seguro.

> El factor de ejes existe porque Google cotiza casetas de automóvil: el valor
> por defecto (2.6×) aproxima la tarifa de un T3-S2. Ajústalo en Ajustes con
> tus propios tickets de caseta y edita el monto cuando haga falta.

## Identidad visual

El color primario del negocio es **`#f2b390`** (durazno / color carne). Toda la
paleta se derivó de ese tono (21° en HSL) para que nada desentone:

| Familia | Uso | Muestras |
| --- | --- | --- |
| `carne` | Color de marca y acciones | `carne-300 #f2b390` fondo de la app y barra superior · `carne-700 #9e4f24` botones principales y acentos |
| `crema` | Superficies | `crema-50 #fffcfa` tarjetas · `crema-100 #fdf4ee` campos · `crema-300/400` bordes |
| `cacao` | Textos | `cacao-900 #2a1c14` principal · `cacao-500 #8a6750` secundario |
| `ladrillo` | Acciones destructivas | `ladrillo-600 #ab3624`, un rojo cálido en lugar de uno frío |

Los contrastes se eligieron para que todo texto cumpla WCAG AA: 9.1:1 del texto
principal sobre el color de marca y 5.8:1 del blanco sobre los botones. El mapa,
el croquis de la ruta, el PDF y los iconos usan esa misma paleta.

Para cambiar el tono de marca basta editar la escala `carne` en
`tailwind.config.js` y los cuatro hex de `theme_color` / `background_color`
(`index.html`, `vite.config.js`, `scripts/generate-icons.mjs`).

## Arranque

```bash
npm install
npm run dev       # desarrollo en http://localhost:5173
npm run build     # producción en dist/
npm run preview   # sirve dist/ para probar la PWA y el modo offline
npm test          # pruebas del motor de cálculo e integraciones
npm run icons     # regenera los iconos PNG de la PWA
```

Para instalarla en el celular: publícala (ver abajo), ábrela en Chrome o Safari
y usa **Agregar a pantalla de inicio**.

### Publicar en GitHub Pages

`.github/workflows/deploy.yml` construye y publica la app en cada push. El sitio
queda en `https://<usuario>.github.io/<repo>/`, por lo que la construcción usa
la variable `BASE_PATH`:

```bash
BASE_PATH=/Sam/ npm run build   # así la construye el flujo de CI
npm run build                   # ruta relativa, para cualquier otro hosting
```

Requisitos: en **Settings → Pages** el origen debe ser *GitHub Actions* (el
flujo intenta activarlo solo). Ojo: Pages en repositorios **privados** exige
plan de pago; con plan gratuito hay que hacer público el repositorio o publicar
en Netlify, Vercel o Cloudflare Pages, que sí aceptan repos privados gratis.
En esos servicios el comando es `npm run build` y la carpeta a publicar `dist`.

## Configurar Google Maps

La API Key se pide dentro de la app (**Ajustes → Google Maps**) y se guarda solo
en ese teléfono, en `localStorage`. En [Google Cloud](https://console.cloud.google.com/)
habilita:

| API | Para qué | ¿Obligatoria? |
| --- | --- | --- |
| Maps JavaScript API | Mapa interactivo de la ruta | Sí |
| Places API | Autocompletado de direcciones | Sí |
| Routes API | Distancia, tiempo **y costo de casetas** con TAG | Recomendada |
| Maps Static API | Imagen del mapa dentro del PDF | Opcional |

Sin Routes API la app usa Directions del SDK y estima las casetas por kilómetro
(lo avisa en pantalla). Sin Maps Static API dibuja un croquis propio de la ruta,
que funciona incluso sin conexión. Y sin ninguna API Key todavía puedes cotizar:
se capturan los kilómetros a mano.

Restringe la key por referente HTTP al dominio donde publiques la app.

## Precio del diésel

**Ajustes → Actualizar desde CRE** consulta los datos abiertos de la Comisión
Reguladora de Energía publicados en
[datos.gob.mx](https://datos.gob.mx/busca/dataset/precios-de-gasolina-y-diesel)
y toma la **mediana nacional** de las estaciones. Si el servicio no responde o
el navegador bloquea la consulta por CORS, la app conserva el último precio con
su fecha y lo marca como desactualizado después de 7 días; siempre puedes
capturarlo a mano. En Ajustes → Avanzado se puede configurar un proxy CORS
propio si quieres automatizar la consulta.

## Estructura

```
src/
├── lib/            Lógica pura y servicios (sin React)
│   ├── calc.js         Costos, margen, IVA y elección de ruta
│   ├── quoteModel.js   Forma de una cotización y sus derivados
│   ├── db.js           IndexedDB: cotizaciones, ajustes y folios
│   ├── maps.js         SDK, Places, Routes API v2 y respaldos
│   ├── mapImage.js     Imagen del mapa para el PDF (+ croquis offline)
│   ├── polyline.js     Codec de polilíneas de Google
│   ├── diesel.js       Precio del diésel (CRE) con respaldos
│   ├── pdf.js          PDF con jsPDF
│   └── whatsapp.js     Mensaje y liga wa.me
├── components/     UI reutilizable, autocompletado, mapa y documento
├── screens/        NewQuote (wizard de 4 pasos), History, QuoteDetail, Settings
└── state/          Contextos de ajustes y avisos
```

## Datos y respaldo

Todo vive en el dispositivo:

- **IndexedDB** (`cotizador-fletes`): cotizaciones, ajustes y el consecutivo de
  folios (`COT-AAAA-0001`).
- **localStorage**: la API Key de Google y el borrador de la cotización en curso.

En **Ajustes → Avanzado → Descargar respaldo** se exporta todo a un JSON. Borrar
los datos del sitio en el navegador borra el historial: haz respaldo antes de
cambiar de teléfono.

## Pruebas

`npm test` cubre el motor de cálculo (costos, margen, IVA, desglose al cliente,
elección de ruta económica vs. rápida), la normalización de la respuesta de
Routes API —incluido el factor de ejes y el respaldo por kilómetro—, el codec de
polilíneas y el mensaje de WhatsApp.

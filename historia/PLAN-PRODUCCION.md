# Plan de producción con herramientas (Autor: BS)

Objetivo: mejorar el arte y el sonido sin desperdiciar créditos. Regla central: **se genera una vez, se reutiliza siempre**.

## Saldos al 15 de noviembre de 2026
- ElevenLabs (plan gratis): 10,000 créditos al mes, usados 288. Renueva el 13 de diciembre.
- vidIQ (plan gratis): 150 créditos, usados 0. Renueva el 13 de diciembre.
- Pendiente de confirmar: la licencia del plan gratis de ElevenLabs para uso comercial en YouTube.

## Quién hace qué
| Tarea | Herramienta | Costo |
|---|---|---|
| Guión, escenarios, continuidad | Texto en el repositorio | Gratis |
| Arte de personajes (por piezas) y fondos | ElevenLabs, imágenes + quitar fondo | Créditos |
| Efectos de sonido y música | ElevenLabs | Créditos |
| Distancia y sala del sonido (gritos desde abajo) | ElevenLabs, efectos de audio | Sin costo según la herramienta |
| Animación, luz, cámara, montaje, exportación | Código (como hasta ahora) | Gratis |
| Miniatura, título y descripción para YouTube | vidIQ | Créditos (al publicar) |
| Respaldo de piezas generadas | Repositorio (y Drive si se quiere) | Gratis |
| Video generado por IA | Solo toma por toma, con aprobación expresa | Créditos (lo más caro) |

## Fases y puertas de aprobación
Cada fase termina con la aprobación de Edgar. No se pasa a la siguiente sin ella.

0. **Decisiones previas (gratis).** Elegir el estilo visual final. Terminar por escrito el guión de las escenas 5 a 9. Sin esto no se sabe qué piezas hacen falta.
1. **Inventario (gratis).** Lista cerrada de todo lo que hay que generar: personajes y vistas, fondos, objetos, sonidos, música. Cada pieza con su texto de pedido (prompt) escrito y aprobado antes de generar.
2. **Prueba de costo (gasto mínimo).** Una generación de cada tipo (un efecto de sonido, una imagen, quitar un fondo). Se mide el saldo antes y después. Con eso se calcula el costo del capítulo completo.
3. **Presupuesto.** Con los costos reales: qué alcanza con el plan gratis, qué se reparte entre meses y si conviene subir de plan. Se reserva 20 % del saldo para correcciones.
4. **Hoja de estilo (1 a 3 imágenes).** Una imagen clave que fije el aspecto (luz, textura, color). Todo lo demás se genera con esa imagen como referencia.
5. **Personajes.** Owen primero, con su diseño aprobado como referencia. Luego los demás. Cada uno una vez, por piezas, con fondo quitado.
6. **Fondos.** Interior del piso de arriba, ventana, escalera con espejo, carretera del aeropuerto.
7. **Sonido y música.** Lluvia, motor, dientes, alarmas de teléfono, gritos, golpes, sirena, respiración. Una canción de Owen.
8. **Animación y montaje (gratis).** En código, escena por escena, con las piezas generadas.
9. **Publicación.** Miniatura y textos con vidIQ.

## Reglas para no desperdiciar
- Nada se genera sin su texto de pedido aprobado.
- Primero en calidad y tamaño bajos; solo la versión elegida se hace en calidad alta.
- Se corrige editando la pieza, no generándola de nuevo.
- Cada pieza generada se guarda de inmediato en `historia/piezas/` y se anota en el registro.
- Nunca se repite una llamada de generación para "reintentar": cobra dos veces.
- Antes de cada sesión de generación se revisa el saldo; se detiene al llegar a la reserva.
- El video generado por IA queda fuera hasta que una toma concreta lo justifique.

## Estilo visual elegido para la prueba
Stop motion de papel recortado y fieltro, sombrío: títeres hechos a mano fotografiados con luz baja de cine, negros profundos, poca profundidad de campo, colores apagados con un solo acento durazno, textura de papel visible. Conserva el diseño aprobado de Owen (pelo negro corto con frente recta y mechón de tres puntas, sin barba, piel clara, audífonos grafito, chamarra gris, playera durazno).

## Costos cotizados (15 de noviembre, una variante por pedido, sin gastar)
| Pedido | Modelo | Créditos |
|---|---|---|
| Imagen | GPT Image 2.5 Sunburst (el predeterminado) | 190 |
| Imagen | Nano Banana 2 Lite | 206 |
| Imagen | Nano Banana Pro | 1,218 |
| Efecto de sonido | Sound Effects v2 | 100 |
| Música | Music v2.5 | 900 |
| Imagen en vidIQ (acepta referencias y fondo transparente) | — | 22 de vidIQ |
| Música en vidIQ | — | 25 de vidIQ |
Por defecto las herramientas piden 4 variantes de imagen: siempre pedir 1. Con 9,712 créditos alcanzan unas 50 imágenes, o menos si se suma sonido y música.

## Pedidos listos para la prueba (290 créditos)
1. **Imagen de estilo** (GPT Image 2.5 Sunburst, 1 variante): "Stop-motion animation still, handmade paper-cutout and felt puppets, dark moody horror, cinematic low-key lighting. Interior of the upper deck of a double-decker bus at night, heavy rain on the windows, yellow handrails, dim fluorescent ceiling light. In the foreground a young man in his late twenties seen in profile, leaning his forehead on the wet window: short black hair with a straight fringe and a small three-pointed tuft on top, clean-shaven, pale skin, graphite over-ear headphones, dark gray jacket over a peach-orange t-shirt. Outside: open flat land and distant airport runway lights. Shallow depth of field, deep blacks, desaturated palette with a single peach accent, visible paper texture, soft handmade shadows. 16:9."
2. **Efecto de sonido** (1 variante): "Heavy rain drumming on the metal roof and windows of a bus, heard from inside, steady, with a low engine hum".

## Registro de gasto
| Fecha | Herramienta | Qué se generó | Créditos antes | Créditos después | Archivo |
|---|---|---|---|---|---|
| 15 nov | ElevenLabs | Intento de imagen de estilo y lluvia: no arrancó (generaciones gratis saturadas) | 9,712 | 9,712 | — |
| 15 nov | ElevenLabs | Segundo intento, con autorización: no arrancó (generaciones gratis saturadas) | 9,712 | 9,712 | — |
| 15 nov | vidIQ | Imagen de estilo: Owen contra el vidrio (1 imagen, 22 créditos) | 150 | 128 | `piezas/estilo-01-owen-ventana.jpg` |

# Plan de producción, versión 2 (Autor: BS)

Estado: **plan aprobado el 16 de noviembre. Fases 1 y 2 terminadas; forma de Owen aprobada y acabado afinado con código. En espera de aprobación del acabado para pasar a la fase 3.**
Regla de trabajo: primero el plan, después las herramientas, y nada se usa ni se gasta sin aprobación.

## Lo que pide Edgar (16 de noviembre de 2026)
- Atmósfera sombría: debe dar miedo. Público: mayores de 14 años.
- Formato: video. La obra es visual: lo que pasa debe entenderse viendo.
- Movimientos anatómicamente correctos y fluidos.
- Continuidad: si un personaje está junto a otro o en una posición, así sigue en la toma siguiente.
- Realismo, porque Owen sobrevive con ingenio aplicando el método: sus soluciones físicas deben creerse.
- Se permite simplificar los diseños y limitar un poco la cantidad de movimientos para que la animación sea posible.
- Lo hecho hasta ahora no sirve como imagen final: los movimientos molestan, las posiciones son incoherentes y no se distingue qué pasa.

## Por qué falló lo anterior
1. **Cada toma se dibujó por separado.** No existe un mundo único: los asientos y las personas se recolocan en cada lámina. Por eso se rompe la continuidad.
2. **Los personajes son recortes planos, sin esqueleto.** Un brazo es una figura que gira; no tiene huesos ni límites de articulación. Por eso los movimientos no son anatómicos.
3. **Figuras de frente y planas.** Las acciones (agarrar, voltear, levantarse) no se leen porque no hay profundidad ni perfil real.

## La solución: un solo escenario en 3D
Construir una vez el autobús en tres dimensiones, con cada pasajero en su asiento y con un esqueleto real. Cada toma es una cámara distinta dentro de ese mismo mundo.
- **Continuidad:** no se puede romper, porque nadie se redibuja; solo cambia la cámara.
- **Anatomía:** huesos de longitud fija, articulaciones con límites, manos y pies que apoyan donde deben.
- **Lectura:** con profundidad y luz real, las acciones se ven de lado, de espaldas o de frente según convenga.
- **Sombrío y realista:** luces con origen (tubo del techo, faros, celulares) y sombras reales.
- **El método de Owen:** la carriola, el paraguas y la escalera tienen tamaño y peso reales; sus soluciones se pueden mostrar paso a paso.

## Estilo propuesto
Espacio, luz y objetos realistas. Personajes como títeres de proporción humana real, con caras simplificadas y muy legibles (ojos, cejas, párpados y boca que se mueven), en la línea del Owen de fieltro que ya se generó. No son humanos fotográficos: eso no se puede lograr con código y mantenerlo coherente.

## Herramientas encontradas (comprobadas como disponibles, sin usarlas)
| Herramienta | Para qué | Costo | Riesgo |
|---|---|---|---|
| Blender, manejado por código | Escenario 3D, esqueletos, luz, render | Gratis | Sin tarjeta gráfica; el tiempo por cuadro hay que medirlo |
| three.js en navegador sin pantalla | Alternativa más rápida y menos realista; sirve para ensayos | Gratis | Menor calidad de luz |
| Modelos humanos libres (MakeHuman) | Cuerpos con anatomía correcta | Gratis | Falta comprobar que se instalan aquí |
| Bibliotecas de movimiento capturado | Caminar, forcejear | Gratis; Mixamo requiere la cuenta de Edgar | Hay que adaptarlas a cada personaje |
| vidIQ (106 créditos) y ElevenLabs (9,712) | Texturas, caras de referencia, fondo de la ventana, sonido | Créditos | ElevenLabs gratis suele estar saturado |
| Video con IA sobre el render 3D | Capa final opcional de realismo, conservando posiciones y movimientos | Créditos, se cotiza antes | Puede alterar caras entre tomas |
| ffmpeg | Montaje y exportación | Gratis | Ninguno |

Equipo disponible: 4 núcleos, 15 GB de memoria, 30 GB de disco.

## Cómo sabremos que está bien (criterios de aceptación)
1. **Mapa de asientos único.** Cada personaje conserva asiento, lado, ropa y objeto en todas las tomas.
2. **Anatomía.** Ningún hueso cambia de largo, ninguna articulación se dobla al revés, nada atraviesa nada.
3. **Lectura sin sonido.** Cada toma se entiende en silencio y se puede describir en una frase.
4. **Fluidez.** Sin saltos de pose; cada gesto tiene preparación, acción y asentamiento.
5. **Miedo.** Poca luz con origen claro, pero las caras y las manos importantes siempre se ven.
6. **Vocabulario limitado.** Unas doce acciones reutilizables: respirar, parpadear, mirar, girar el torso, llevar la mano a la cabeza, agarrar, levantarse, caminar, jalar, retroceder, señalar, agacharse.

## Fases, cada una con aprobación antes de pasar a la siguiente
0. **Aprobación de este plan.**
1. **Prueba técnica, gratis y sin animación.** Autobús en bloques grises con dos maniquíes sentados, vistos desde tres cámaras. Entrega: tres imágenes fijas y el tiempo real por cuadro. Decide si se trabaja con Blender o con three.js.
2. **Owen en 3D, imágenes fijas.** Frente, perfil y espalda; seis expresiones; las doce acciones en pose. Se aprueba el personaje antes de moverlo.
3. **Escenario completo, imágenes fijas.** Mapa de asientos, luz de calma y luz de pánico.
4. **Prueba de movimiento.** Una sola toma de cinco segundos (Owen levanta el audífono).
5. **Ensayo de cada escena en baja calidad,** aprobación, y render final.
6. **Sonido y música.**
7. **Montaje y exportación.**

## Resultado de la fase 1 (16 de noviembre de 2026)
Hecho: el piso de arriba del autobús a escala real (2.4 m de ancho, 9 m de largo, 7 filas de asientos, pasamanos, escalera al fondo, ventanas con vidrio, pista con luces afuera) y dos maniquíes con esqueleto de 16 huesos, cada uno en su asiento. Tres cámaras dentro del mismo mundo. Sin animación y sin gasto.
Archivos: `3d/escena.py` (la escena completa en código) y `3d/pruebas/fase1-cam*.jpg`.
Para reinstalar Blender en una sesión nueva: `pip install bpy` (menos de un minuto).

| Modo | Tamaño | Tiempo por cuadro | 9 minutos a 12 cuadros/s | 9 minutos a 24 cuadros/s |
|---|---|---|---|---|
| Realista, calidad alta (64 muestras) | 1920×1080 | 215 s | 16 días | 32 días |
| Realista, calidad media (48 muestras) | 1280×720 | 81 s | 6 días | 12 días |
| Realista rápido (6 muestras y limpieza de ruido) | 1280×720 | 14 s | 25 horas | 50 horas |
| Tiempo real de Blender (sin tarjeta gráfica) | 1280×720 | 14 s | 25 horas | 50 horas |

Conclusión: el modo «realista rápido» da la misma velocidad que el motor de tiempo real y mejor imagen (vidrios, reflejos, luces de la pista). El motor de tiempo real pierde los vidrios y mete ruido en este equipo.
Recomendación: Blender con el modo realista rápido a 1280×720 y 12 cuadros por segundo, ampliado a 1080 en el montaje. Calidad alta solo para imágenes fijas de aprobación. Ensayos de movimiento a tamaño pequeño.
Pendiente de comprobar en la fase 4: si la limpieza de ruido parpadea de un cuadro a otro.

## Resultado de la fase 2 (16 de noviembre de 2026)
Formato de trabajo aprobado por Edgar: 1280×720 a 12 cuadros por segundo.
Hecho: Owen en 3D con esqueleto de 46 huesos (columna, cuello, cabeza, brazos, piernas, cinco dedos por mano, ojos, párpados, cejas, boca). Mide 1.76 m. Las poses se resuelven con huesos de largo fijo; codos y rodillas doblan como bisagra.
Archivos: `3d/base3d.py`, `3d/personaje.py`, `3d/hoja_owen.py`; imágenes en `3d/pruebas/fase2/` y hojas `3d/pruebas/fase2-hoja-*.jpg`; página `owen-3d.html`.
Entregado: 4 vistas, 6 expresiones (calma, atento, duda, alarma, miedo, decisión), 12 poses del vocabulario y 3 acercamientos de manos. Sin gasto de créditos.
Forma aprobada por Edgar el 16 de noviembre. Acabado: opción A, afinar con código.

### Acabado afinado con código (16 de noviembre de 2026)
Sin cambiar proporciones, esqueleto ni poses:
- Cara: nariz con puente, punta y aletas; labios; pestañas que siguen al párpado; párpado inferior; arco de cejas.
- Pelo: 46 mechones sobre el casco, con fleco recto que deja ver las cejas, y mechón de tres puntas.
- Tela: grano y variación de tono en piel, playera, chamarra y pantalón.
- Chamarra: orilla con cierre, cuello, bajo, bolsillos y pliegues en codos, rodillas y tobillos.
Imágenes anteriores para comparar: `3d/pruebas/fase2-antes/`.
Límites que siguen: la ropa es rígida (no ondea ni se arruga al moverse), el mechón todavía se lee algo duro de frente, y el grano de la tela casi no se nota en tomas abiertas.
Opción B (pasada de imagen con IA sobre el render) queda para una toma terminada, con cotización y aprobación.

## Riesgo principal
El tiempo de render. Nueve minutos a 24 cuadros por segundo son casi 13,000 cuadros. Si cada cuadro tarda 10 segundos, son 36 horas de cálculo. Salidas posibles: animar a 12 cuadros por segundo (aspecto de stop motion, que va con los títeres), renderizar a menor tamaño, o hacerlo por tandas. La fase 1 lo mide antes de comprometer nada.

## Lo que se conserva
El guión, el canon del contagio, las reglas de continuidad, las decisiones de sonido y el diseño de Owen como referencia.

## Costos cotizados (15 de noviembre, una variante por pedido)
| Pedido | Créditos |
|---|---|
| Imagen en ElevenLabs (modelo predeterminado) | 190 |
| Imagen en ElevenLabs (mayor calidad) | 1,218 |
| Efecto de sonido en ElevenLabs | 100 |
| Música en ElevenLabs | 900 |
| Imagen en vidIQ (acepta referencias y fondo transparente) | 22 de vidIQ |
| Música en vidIQ | 25 de vidIQ |

## Registro de gasto
| Fecha | Herramienta | Qué se generó | Créditos antes | Créditos después | Archivo |
|---|---|---|---|---|---|
| 15 nov | ElevenLabs | Dos intentos de imagen y lluvia: no arrancaron (cola gratis saturada) | 9,712 | 9,712 | — |
| 15 nov | vidIQ | Imagen de estilo: Owen contra el vidrio | 150 | 128 | `piezas/estilo-01-owen-ventana.jpg` |
| 15 nov | vidIQ | Owen de cuerpo entero, fondo transparente | 128 | 106 | `piezas/owen-01-cuerpo-entero.png` |

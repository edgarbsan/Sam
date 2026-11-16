# Plan de producción, versión 2 (Autor: BS)

Estado: **propuesta en espera de aprobación de Edgar. No se ha construido ni animado nada de esta versión.**
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

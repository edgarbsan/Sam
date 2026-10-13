<img src="src/ave-chica-tostado.svg" width="40" alt="Marca de autor BS">

# Simulador G

Simulador 3D de código G para centro de maquinado (fresadora vertical). Funciona en el navegador del teléfono, sin instalar nada.

- `index.html`: archivo independiente. Ábrelo en el navegador del teléfono o súbelo a cualquier hosting estático (por ejemplo GitHub Pages).
- `simulador.html`: la misma página, en el formato que se publica como Artifact en claude.ai.
- `src/`: plantilla y `build.py`, que arma los dos archivos anteriores con la marca.

## Qué simula

- G00, G01, G02 y G03 (con R o I/J/K, hélices y planos G17, G18 y G19)
- G90/G91, G94/G95, G04 y G28
- Milímetros y pulgadas: si el programa no trae G20/G21, se lee en las unidades elegidas en Montaje (como el parámetro del control) y se avisa; lee G20/G21 (aunque cambien a mitad del programa) y el botón MM/IN del visor cambia las unidades en pantalla (posición, avance, límites, diámetros y velocidad de rápidos) sin tocar el código
- Ciclos fijos G73, G81, G82, G83, G84, G85, G86 y G89, con G98/G99 y repeticiones L/K
- T, M06, M03/M04/M05, S y F, más el diámetro de la herramienta leído de comentarios como `(T2 D=10.)`
- Botón RUTA en el visor: muestra cortes y rápidos, solo cortes, o ninguna trayectoria (para ver limpio el material)
- Material (stock) con desbaste en 3D: mapa de alturas 2.5D con fresa plana, de bola o broca (según la descripción de la herramienta). Rectangular o redondo (cilindro de pie). Las medidas se capturan en Resumen o se fijan en el programa con un comentario: `(STOCK X0/100 Y0/80 Z-20/0)` para rectangular o `(STOCK D60 X0 Y0 Z-30/0)` para redondo (D diámetro, X Y centro). Lo maquinado se ve en durazno y un G00 que entra al material se marca en rojo con aviso de posible choque
- Pestaña Montaje: medidas del material y, por cada herramienta detectada, diámetro y longitud (lo que sale del portaherramientas). Las medidas capturadas mandan sobre los comentarios del programa y se guardan por número de herramienta en el teléfono. Con la longitud capturada avisa cuando el portaherramientas tocaría el material
- Tiempo de ciclo estimado, límites de corte y tiempo por herramienta
- Avisos: rápidos por debajo de Z0, arcos con radio inválido, corte con el husillo detenido, F no definido, códigos no reconocidos

## Lo que no hace

El desbaste no muestra socavados (herramientas en T o cola de milano) ni ejes rotativos. No simula compensación G41/G42, orígenes G54 a G59 distintos, G52/G92, G68 ni subprogramas M98. G28 se dibuja hacia X0 Y0 y una Z de seguridad.

Autor: BS

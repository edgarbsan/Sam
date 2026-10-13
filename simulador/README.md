<img src="src/ave-chica-tostado.svg" width="40" alt="Marca de autor BS">

# Simulador G

Simulador 3D de código G para centro de maquinado (fresadora vertical). Funciona en el navegador del teléfono, sin instalar nada.

- `index.html`: archivo independiente. Ábrelo en el navegador del teléfono o súbelo a cualquier hosting estático (por ejemplo GitHub Pages).
- `simulador.html`: la misma página, en el formato que se publica como Artifact en claude.ai.
- `src/`: plantilla y `build.py`, que arma los dos archivos anteriores con la marca.

## Qué simula

- G00, G01, G02 y G03 (con R o I/J/K, hélices y planos G17, G18 y G19)
- G90/G91, G94/G95, G04 y G28
- Milímetros y pulgadas: lee G20/G21 (aunque cambien a mitad del programa) y el botón MM/IN del visor cambia las unidades en pantalla (posición, avance, límites, diámetros y velocidad de rápidos) sin tocar el código
- Ciclos fijos G73, G81, G82, G83, G84, G85, G86 y G89, con G98/G99 y repeticiones L/K
- T, M06, M03/M04/M05, S y F, más el diámetro de la herramienta leído de comentarios como `(T2 D=10.)`
- Tiempo de ciclo estimado, límites de corte y tiempo por herramienta
- Avisos: rápidos por debajo de Z0, arcos con radio inválido, corte con el husillo detenido, F no definido, códigos no reconocidos

## Lo que no hace

No simula remoción de material, compensación G41/G42, orígenes G54 a G59 distintos, G52/G92, G68 ni subprogramas M98. G28 se dibuja hacia X0 Y0 y una Z de seguridad.

Autor: BS

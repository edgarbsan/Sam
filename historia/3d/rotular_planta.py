# Autor: BS
# Pone números y leyenda sobre la vista desde arriba: el mapa de asientos de continuidad.
# Uso: python3 rotular_planta.py carpeta   (lee planta.jpg y planta.json, escribe mapa-asientos.jpg)
import sys, json, os
from PIL import Image, ImageDraw, ImageFont

d = sys.argv[1] if len(sys.argv) > 1 else 'pruebas/fase3'
im = Image.open(os.path.join(d, 'planta.jpg')).convert('RGB'); W, H = im.size
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import autobus as A
from reparto import MAPA
# Cámara ortogonal de escena3.planta(): centro (0, 4.5), girada 90°: a la derecha queda el fondo del autobús (+y), arriba el lado de la pista (-x).
ESC = 9.6; ALTO_M = ESC * H / W
pts = {n: (.5 + (A.FILAS[f - 1] - .04 - 4.5) / ESC, .5 + A.CX[(l, p)] / ALTO_M) for n, (f, l, p) in MAPA.items()}
NUM = {'Owen': '1', 'Señor': '2', 'Madre': '3', 'Hijo': '4', 'Adolescente': '5', 'Ejecutivo': '6', 'Hombre': '7',
       'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G'}
NOMBRE = {'Owen': 'Owen', 'Señor': 'El señor del paraguas', 'Madre': 'La madre (curita)', 'Hijo': 'Su hijo',
          'Adolescente': 'El adolescente (graba)', 'Ejecutivo': 'El ejecutivo (al teléfono)', 'Hombre': 'El hombre de la venda (desde la escena 3)',
          'A': 'Señora', 'B': 'Joven dormido', 'C': 'Joven con celular', 'D': 'Señor calvo', 'E': 'Pareja, ella', 'F': 'Pareja, él', 'G': 'Mujer de gorro'}
DURAZNO, NEGRO, BLANCO, GRIS = (207, 130, 90), (0, 0, 0), (255, 255, 255), (124, 116, 112)
F = '/usr/share/fonts/opentype/inter/'
def fuente(n, t):
    try: return ImageFont.truetype(F + n, t)
    except Exception: return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', t)
fb, fl, ft = fuente('Inter-Bold.otf', 30), fuente('Inter-Regular.otf', 26), fuente('Inter-SemiBold.otf', 24)
pie = 330; out = Image.new('RGB', (W, H + pie), NEGRO); out.paste(im, (0, 0)); g = ImageDraw.Draw(out)
for n, (u, v) in pts.items():
    x, y = u * W, v * H; r = 24
    fondo = DURAZNO if n == 'Owen' else (BLANCO if NUM[n].isdigit() else GRIS)
    g.ellipse((x - r, y - r, x + r, y + r), fill=fondo, outline=NEGRO, width=3)
    g.text((x, y + 1), NUM[n], fill=NEGRO, font=fb, anchor='mm')
# orientación
g.text((14, 12), 'FRENTE', fill=BLANCO, font=ft) if pts['Madre'][0] < .5 else g.text((W - 14, 12), 'FRENTE', fill=BLANCO, font=ft, anchor='ra')
g.text((W - 30, 22), 'LADO DE LA PISTA (ventanas de Owen)', fill=BLANCO, font=ft, anchor='ra')
g.text((W * .42, H - 22), 'LADO DE LA ESCALERA', fill=BLANCO, font=ft, anchor='md')
xe = (.5 + (7.6 - 4.5) / ESC) * W
g.text((xe, H * .5 + 26), 'ESCALERA ↓', fill=BLANCO, font=ft, anchor='mm')
for f in range(1, 8):
    g.text(((.5 + (A.FILAS[f - 1] + .02 - 4.5) / ESC) * W, H * .5), str(f), fill=GRIS, font=ft, anchor='mm')
# leyenda
orden = ['Owen', 'Señor', 'Madre', 'Hijo', 'Adolescente', 'Ejecutivo', 'Hombre', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
col_w = W // 3
for i, n in enumerate(orden):
    cx = 30 + (i // 5) * col_w; cy = H + 40 + (i % 5) * 54; r = 19
    fondo = DURAZNO if n == 'Owen' else (BLANCO if NUM[n].isdigit() else GRIS)
    g.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fondo, outline=BLANCO if fondo == NEGRO else NEGRO, width=2)
    g.text((cx, cy + 1), NUM[n], fill=NEGRO, font=fuente('Inter-Bold.otf', 22), anchor='mm')
    g.text((cx + 32, cy), NOMBRE[n], fill=BLANCO, font=fl, anchor='lm')
g.text((W - 20, H + pie - 24), 'Autor: BS', fill=GRIS, font=ft, anchor='rm')
out.save(os.path.join(d, 'mapa-asientos.jpg'), quality=92)
print('mapa listo', out.size)

# Autor: BS
# Fase 3: el reparto de pie, en fila, para revisar que cada uno se distinga.
# Uso: python3 hoja_reparto.py --out carpeta [--rapido]
import bpy, sys, os, time, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base3d as B
import reparto as RP
from mathutils import Vector

ap = argparse.ArgumentParser(); ap.add_argument('--out', default='pruebas/fase3'); ap.add_argument('--rapido', action='store_true')
args = ap.parse_args()
B.reiniciar(); S = bpy.context.scene
w = bpy.data.worlds.new('estudio'); w.use_nodes = True; S.world = w; w.node_tree.nodes['Background'].inputs[0].default_value = (0.012, 0.012, 0.014, 1)
gris = B.mat('fondo', (0.045, 0.045, 0.05), 0.9); B.caja('suelo', (-20, -12, -.02), (20, 12, 0), gris); B.caja('pared', (-20, 4, 0), (20, 4.1, 8), gris)
B.luz_area('principal', (-4, -6, 4.5), (0, 0, 1.1), 4, 2, 900, (1.0, 0.96, 0.9))
B.luz_area('relleno', (5, -5, 2.0), (0, 0, 1.0), 4, 2, 220, (0.85, 0.9, 1.0))
B.luz_area('contra', (0, 3.2, 3.2), (0, 0, 1.3), 8, 1, 400, (1.0, 0.95, 0.85))
R = RP.construir_reparto()
orden = ['Owen', 'Madre', 'Hijo', 'Adolescente', 'Señor', 'Ejecutivo', 'Hombre', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
paso = .62
for i, n in enumerate(orden):
    per = R[n]['per']; per.arm.location = ((i - (len(orden) - 1) / 2) * paso, 0, 0)
    per.cara(parpado=.15)
bpy.context.view_layer.update()
os.makedirs(args.out, exist_ok=True)
q = .5 if args.rapido else 1.0
def tomar(nombre, cam, rx, ry, ms):
    B.preparar_render(int(rx * q), int(ry * q), ms, -0.3); S.camera = cam; S.render.filepath = os.path.join(args.out, nombre + '.jpg')
    t0 = time.time(); bpy.ops.render.render(write_still=True); print(f'LISTO {nombre} {time.time() - t0:.0f}s', flush=True)
ancho = (len(orden) - 1) * paso
tomar('reparto-cuerpo', B.camara('fila', (0, -16, 1.1), (0, 0, .88), 52), 2400, 560, 24 if args.rapido else 40)
# retratos: uno por personaje, a la altura de su cabeza
for n in orden:
    per = R[n]['per']; h = per.arm.matrix_world @ per.pb('cabeza').head; s = R[n]['escala'] * per.escala_huesos.get('cabeza', 1.0)
    c = h + Vector((0, 0, .11 * s))
    tomar(f'retrato-{n}', B.camara(f'ret{n}', (c.x - .45 * s, c.y - 1.55 * s, c.z + .04), (c.x, c.y, c.z - .005), 85), 480, 560, 24 if args.rapido else 40)

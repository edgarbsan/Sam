# Autor: BS
# Fase 2: hoja de Owen en 3D. Imágenes fijas: giro, expresiones y poses.
# Uso: python3 hoja_owen.py --que giro,caras,poses --out carpeta [--rapido]
import bpy, sys, os, math, time, argparse
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base3d as B
from personaje import owen, R

ap = argparse.ArgumentParser(); ap.add_argument('--que', default='giro,caras,poses'); ap.add_argument('--out', default='pruebas/fase2')
ap.add_argument('--rapido', action='store_true'); ap.add_argument('--solo', default='')
args = ap.parse_args()
B.reiniciar(); S = bpy.context.scene
w = bpy.data.worlds.new('estudio'); w.use_nodes = True; S.world = w; w.node_tree.nodes['Background'].inputs[0].default_value = (0.012, 0.012, 0.014, 1)
gris = B.mat('fondo', (0.045, 0.045, 0.05), 0.9); B.caja('suelo', (-12, -12, -.02), (12, 12, 0), gris); B.caja('pared', (-12, 5, 0), (12, 5.1, 8), gris)
B.luz_area('principal', (-2.6, -3.4, 3.2), (0, 0, 1.1), 1.6, 1.6, 260, (1.0, 0.96, 0.9))
B.luz_area('relleno', (3.0, -2.6, 1.6), (0, 0, 1.0), 2.0, 2.0, 60, (0.85, 0.9, 1.0))
B.luz_area('contra', (1.2, 3.2, 2.8), (0, 0, 1.3), 1.2, 1.2, 180, (1.0, 0.95, 0.85))
o = owen()
asiento = B.mat('asiento', (0.07, 0.09, 0.14), 0.9); tubo = B.mat('tubo', (0.75, 0.55, 0.05), 0.35, metal=0.6)
silla = [B.caja('cojin', (-.26, -.20, .0), (.26, .26, .40), asiento), B.caja('respaldo', (-.26, .26, 0), (.26, .32, 1.02), asiento)]
poste = [B.tubo('poste', (-.272, -.235, 0), (-.272, -.235, 2.0), .017, tubo)]
def ver(objs, si):
    for x in objs: x.hide_render = not si

from poses import SENT, PIES_S, MANOS_S, sentado, CARAS, brazo_aud
POSES = [
 ('01-respirar', True, False, lambda: sentado(cabeza=(3, 0, 0), cara=CARAS['1-calma'])),
 ('02-parpadear', True, False, lambda: sentado(cabeza=(3, 0, 0), cara=dict(parpado=1.0))),
 ('03-mirar', True, False, lambda: sentado(tronco=(-4, 10, 0), cabeza=(0, 58, 0), cara=dict(parpado=.05, ceja=(.003, .003), mirada=(6, -1.5, 1.4)))),
 ('04-girar-el-torso', True, False, lambda: sentado(tronco=(-2, 52, 4), cabeza=(-2, 48, 0), brazos={'I': dict(pos=(.31, .30, 1.05), polo=(.6, .3, -.7), dedos=(.75, .6, -.25), palma=(0, 0, -1), curl=.55), 'D': dict(pos=(.02, -.24, .585), polo=(-.6, .6, -.4), dedos=(.3, -1, -.1), palma=(0, 0, -1), curl=.2)}, cara=dict(parpado=.0, ceja=(.004, .004), mirada=(3, 5, 1.3)))),
 ('05-mano-al-audifono', True, False, 'aud'),
 ('06-agarrar', False, True, lambda: dict(tronco=(2, 0, 0), brazos={'D': dict(pos=(-.300, -.165, 1.33), polo=(-.5, .5, -.7), dedos=(.05, -1, 0), palma=(1, 0, 0), curl=1.0, pulgar=1.0)}, cara=dict(parpado=.1))),
 ('07-levantarse', True, False, lambda: dict(cadera=(0, -.06, -.27), cadera_flex=34, tronco=(10, 0, 0), cabeza=(-30, 0, 0), piernas={s: dict(pos=(sx * .11, -.30, .085)) for s, sx in (('I', 1), ('D', -1))}, brazos={s: dict(pos=(sx * .14, -.36, .50), polo=(sx * .6, .7, .2), dedos=(0, -.7, -.7), palma=(0, -.3, -1), curl=.45) for s, sx in (('I', 1), ('D', -1))}, cara=dict(parpado=.05))),
 ('08-caminar', False, False, lambda: dict(cadera=(0, 0, -.035), tronco=(4, -6, 0), cabeza=(-2, 4, 0), piernas={'I': dict(pos=(.09, -.31, .11), punta=(0, -1, .22)), 'D': dict(pos=(-.09, .30, .15), punta=(0, -.72, -.69))}, brazos={'D': dict(pos=(-.21, -.24, .93), polo=(-.3, 1, -.2), curl=.3), 'I': dict(pos=(.22, .22, .96), polo=(.3, 1, .2), curl=.3)}, cara=dict(parpado=.1))),
 ('09-jalar', False, False, lambda: dict(cadera=(0, .13, -.13), cadera_flex=-14, tronco=(4, 0, 0), cabeza=(12, 0, 0), piernas={'I': dict(pos=(.12, -.24, .085)), 'D': dict(pos=(-.12, .10, .085))}, brazos={s: dict(pos=(sx * .075, -.50, 1.06), polo=(sx * .7, .2, -.7), dedos=(0, -1, 0), curl=1.0, pulgar=1.0) for s, sx in (('I', 1), ('D', -1))}, cara=CARAS['6-decision'])),
 ('10-retroceder', False, False, lambda: dict(cadera=(0, .14, -.05), cadera_flex=-13, tronco=(-3, 0, 0), cabeza=(8, 0, 0), piernas={'I': dict(pos=(.10, -.06, .085)), 'D': dict(pos=(-.11, .38, .11), punta=(0, -.9, -.42))}, brazos={s: dict(pos=(sx * .21, -.24, 1.33), polo=(sx * .6, .3, -.75), dedos=(0, -.3, 1), palma=(0, -1, 0), curl=.08, pulgar=0) for s, sx in (('I', 1), ('D', -1))}, cara=CARAS['5-miedo'])),
 ('11-senalar', False, False, lambda: dict(tronco=(2, 14, 0), cabeza=(0, 26, 0), brazos={'I': dict(pos=(.44, -.40, 1.39), polo=(.5, .4, -.75), dedos=(.66, -.75, .03), palma=(0, 0, -1), curl=1.0, indice=0.0, pulgar=.35)}, cara=dict(parpado=.05, ceja=(.003, .003), mirada=(5, -6, 1.5)))),
 ('12-agacharse', False, False, lambda: dict(cadera=(0, .10, -.50), cadera_flex=32, tronco=(14, 0, 0), cabeza=(-34, 0, 0), piernas={s: dict(pos=(sx * .13, -.02, .085), polo=(sx * .45, -1, .2)) for s, sx in (('I', 1), ('D', -1))}, brazos={'I': dict(pos=(.17, -.36, .47), polo=(.8, .4, .2), dedos=(0, -.6, -.8), palma=(0, -.4, -1), curl=.5), 'D': dict(pos=(-.19, -.44, .10), polo=(-.8, .5, .2), dedos=(0, -.25, -1), palma=(0, 1, 0), curl=.25)}, cara=dict(parpado=.05, ceja=(.003, .003)))),
]
def poner(spec):
    if spec == 'aud':
        o.pose(**sentado(cabeza=(2, 10, -4)))
        d = sentado(cabeza=(2, 10, -4), cara=CARAS['2-atento']); d['brazos'] = dict(MANOS_S); d['brazos']['I'] = brazo_aud(o); o.pose(**d)
    else: o.pose(**spec())

q = .5 if args.rapido else 1.0; ms = 10 if args.rapido else 40
os.makedirs(args.out, exist_ok=True)
def tomar(nombre, cam, rx, ry):
    B.preparar_render(int(rx * q), int(ry * q), ms, -0.3); S.camera = cam; S.render.filepath = os.path.join(args.out, nombre + '.jpg')
    t0 = time.time(); bpy.ops.render.render(write_still=True); print(f'LISTO {nombre} {time.time() - t0:.0f}s', flush=True)
solo = [x for x in args.solo.split(',') if x]
if 'giro' in args.que:
    ver(silla, False); ver(poste, False); o.pose(cara=dict(parpado=.15))
    cam = B.camara('cuerpo', (0, -7.2, 1.0), (0, 0, .90), 122)
    for nombre, ang in (('giro-1-frente', 0), ('giro-2-tres-cuartos', 38), ('giro-3-perfil', 90), ('giro-4-espalda', 180)):
        if solo and nombre not in solo: continue
        o.arm.rotation_euler = (0, 0, R(ang)); bpy.context.view_layer.update(); tomar(nombre, cam, 600, 1000)
    o.arm.rotation_euler = (0, 0, 0)
if 'caras' in args.que:
    ver(silla, False); ver(poste, False)
    cam = B.camara('cara', (-.42, -1.55, 1.66), (0, -.02, 1.628), 150, fstop=8, foco=(0, -.08, 1.63))
    for nombre, c in CARAS.items():
        if solo and nombre not in solo: continue
        o.pose(cara=c); tomar('cara-' + nombre, cam, 640, 640)
if 'poses' in args.que:
    cam = B.camara('pose', (-2.9, -5.6, 1.35), (0, -.05, .84), 104)
    for nombre, sil, pos, spec in POSES:
        if solo and nombre not in solo: continue
        ver(silla, sil); ver(poste, pos); poner(spec); tomar('pose-' + nombre, cam, 640, 800)
if 'manos' in args.que:
    ver(silla, False)
    ver(poste, False); o.pose(brazos={'D': dict(pos=(-.30, -.30, 1.18), polo=(-.5, .5, -.7), dedos=(0, -.2, 1), palma=(0, -1, 0), curl=.04, pulgar=0)})
    w = o.pb('mano.D').head; tomar('mano-1-abierta', B.camara('m1', (w.x - .10, w.y - .95, w.z + .10), (w.x, w.y, w.z + .08), 120), 640, 640)
    ver(poste, True); poner(POSES[5][3])
    w = o.pb('mano.D').head; tomar('mano-2-agarre', B.camara('m2', (w.x - .55, w.y - .80, w.z + .12), (w.x + .02, w.y - .05, w.z), 120), 640, 640)
    ver(poste, False); poner(POSES[10][3])
    w = o.pb('mano.I').head; tomar('mano-3-senala', B.camara('m3', (w.x - .50, w.y - .85, w.z + .20), (w.x + .05, w.y - .06, w.z), 120), 640, 640)

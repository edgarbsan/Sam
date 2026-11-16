# Autor: BS
# Fase 3: el piso de arriba completo, con todo el reparto en su asiento del mapa. Imágenes fijas.
# Dos estados de luz: calma (fin de la escena 3) y pánico (escenas 5 a 7: el hombre de la venda ya no está arriba).
# Uso: python3 escena3.py --estados calma,panico --tomas general-frente,... --out carpeta [--rapido]
import bpy, sys, os, math, time, json, argparse
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base3d as B
import autobus as A
import reparto as RP
from poses import sentado, cara, MANOS_S, brazo_oreja, LADO_S

ap = argparse.ArgumentParser()
ap.add_argument('--estados', default='calma,panico'); ap.add_argument('--tomas', default='')
ap.add_argument('--out', default='pruebas/fase3'); ap.add_argument('--rapido', action='store_true')
args = ap.parse_args()

B.reiniciar(); S = bpy.context.scene
BUS = A.construir()
R = RP.construir_reparto()
PISO = {n: RP.colocar(n) for n in RP.MAPA}
ESCALERA = Vector((.74, 7.7, .25))      # a donde miran todos en el pánico

# ---------- utilería ----------
def m_negro(): return BUS['M']['negro']
MT = dict(tel=B.mat('telefono', (0.02, 0.02, 0.022), 0.3), pant=B.mat('pantalla_tel', (1, 1, 1), 0.4, emit=(0.55, 0.7, 1.0), strength=1.2),
          tela=B.mat('paraguas', (0.012, 0.012, 0.014), 0.6, sheen=.2), madera=B.mat('mango', (0.16, 0.08, 0.04), 0.5))

def telefono(nombre, centro, largo, normal, escala=1.0, encendido=True):
    """centro y ejes en el mundo; largo: eje largo del teléfono; normal: hacia donde mira la pantalla."""
    largo = Vector(largo).normalized(); normal = Vector(normal); normal = (normal - largo * normal.dot(largo)).normalized(); ancho = largo.cross(normal)
    M = Matrix((ancho, largo, normal)).transposed().to_4x4(); M.translation = centro
    bm = bmesh_box((.072, .152, .008)); o = B.terminar(bm, nombre, MT['tel'], smooth=False); o.matrix_world = M @ Matrix.Scale(escala, 4)
    if encendido:
        bm = bmesh_box((.064, .138, .001)); p = B.terminar(bm, nombre + '_pantalla', MT['pant'], smooth=False)
        p.parent = o; p.location = (0, 0, .0045)
    return o

import bmesh
def bmesh_box(t):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * t[0], v.co.y * t[1], v.co.z * t[2]))
    return bm

def paraguas(nombre, base, alto, escala):
    bm, bh = bmesh.new(), bmesh.new()
    B.capsula(bm, base, base + Vector((0, 0, alto * .78)), .004 * escala, .006 * escala, 8)
    B.capsula(bm, base + Vector((0, 0, .06 * escala)), base + Vector((0, 0, alto * .70)), .010 * escala, .036 * escala, 16)  # tela enrollada
    top = base + Vector((0, 0, alto * .78)); r = .035 * escala
    B.cadena(bh, [top] + [top + Vector((0, -r + r * math.cos(a), .03 * escala + r * math.sin(a))) for a in [math.pi * k / 8 for k in range(9)]], .011 * escala, .010 * escala, 10)
    B.terminar(bm, nombre, MT['tela']); B.terminar(bh, nombre + '_mango', MT['madera'])
    return top + Vector((0, 0, .03 * escala))

def mundo(n, p_local):
    r = R[n]; return r['per'].arm.location + r['escala'] * Vector(p_local)

# ---------- poses ----------
def ojos_a(n, p_mundo): return tuple(RP.a_local(n, p_mundo))

def girar_hacia(n, objetivo, cara_nombre, mano_respaldo=False, **k):
    """Voltea tronco y cabeza hacia un punto (más de 90 grados se reparten entre tronco, cuello y ojos)."""
    per = R[n]['per']; loc = per.arm.location
    d = Vector(objetivo) - loc; ang = math.degrees(math.atan2(d.x, -d.y))  # 0 = al frente; positivo = a su izquierda (+x)
    ang = max(-150, min(150, ang)); tr = ang * .42; ca = ang * .45
    spec = sentado(PISO[n], tronco=(-3, tr, 3 if ang > 0 else -3), cabeza=(-4, ca, 0), cara=cara(cara_nombre, mirada=ojos_a(n, objetivo)))
    if mano_respaldo:
        s, sx = ('I', 1) if ang > 0 else ('D', -1)
        spec['brazos'] = dict(MANOS_S); spec['brazos'][s] = dict(pos=(sx * .31, .30, 1.06), polo=(sx * .6, .3, -.7), dedos=(sx * .75, .6, -.25), palma=(0, 0, -1), curl=.55)
    spec.update(k); per.pose(**spec)

def tel_en_manos(n, centro_l, mira_l, nombre, encendido=True):
    """Teléfono horizontal sostenido con las dos manos. Coordenadas locales del esqueleto."""
    per = R[n]['per']; s = R[n]['escala']; c = Vector(centro_l); mira = (Vector(mira_l) - c).normalized()
    lado = Vector((0, 0, 1)).cross(mira).normalized()  # eje largo del teléfono (horizontal)
    if lado.x < 0: lado = -lado
    o = telefono(nombre, mundo(n, c), lado, mira, s, encendido)
    br = {}
    for sd, sx in LADO_S:
        w = c + lado * (sx * .092) - Vector((0, 0, .055)) - mira * .01
        br[sd] = dict(pos=tuple(w), polo=(sx * .7, .5, -.5), dedos=tuple((Vector((0, 0, 1)) - mira * .25).normalized()), palma=tuple(-lado * sx), curl=.5, pulgar=.2)
    return o, br

def posar(estado):
    panico = estado == 'panico'
    for n in R:
        per = R[n]['per']; per.reposo()
    # Owen
    if not panico: R['Owen']['per'].pose(**sentado(PISO['Owen'], tronco=(-4, -6, 0), cabeza=(4, -30, 0), cara=cara('1-calma', mirada=ojos_a('Owen', (-4, 2.2, 1.0)))))
    else: girar_hacia('Owen', ESCALERA, '6-decision', mano_respaldo=True)
    # la madre y su hijo
    if not panico:
        R['Madre']['per'].pose(**sentado(PISO['Madre'], cabeza=(10, 12, 4), cara=cara('1-calma', mirada=ojos_a('Madre', mundo('Hijo', (0, -.05, 1.1))))))
        R['Hijo']['per'].pose(**sentado(PISO['Hijo'], tronco=(-6, 0, -9), cabeza=(6, -8, -16), cara=dict(parpado=1.0), piernas={sd: dict(pos=(sx * .09, -.72, .30)) for sd, sx in LADO_S}))
    else:
        girar_hacia('Madre', ESCALERA, '5-miedo')
        girar_hacia('Hijo', ESCALERA, '4-alarma', piernas={sd: dict(pos=(sx * .09, -.72, .30)) for sd, sx in LADO_S})
    # el adolescente: graba con el celular
    n = 'Adolescente'
    if not panico:
        R[n]['per'].pose(**sentado(PISO[n], cabeza=(20, 0, 0), cara=cara('2-atento')))
        o, br = tel_en_manos(n, (0, -.30, .86), (0, .05, 1.18), 'tel_adolescente')
        R[n]['per'].pose(**sentado(PISO[n], cabeza=(20, 0, 0), brazos=br, cara=cara('2-atento', mirada=(0, -.30, .86))))
    else:
        girar_hacia(n, ESCALERA, '4-alarma')
        per = R[n]['per']; ojo = RP.a_local(n, per.arm.matrix_world @ per.pb('cabeza').head) + Vector((0, 0, .13))
        d = (RP.a_local(n, ESCALERA) - ojo).normalized(); c = ojo + d * .34 - Vector((0, 0, .06))
        o, br = tel_en_manos(n, c, ojo, 'tel_adolescente')
        girar_hacia(n, ESCALERA, '4-alarma', brazos=br)
        ld = bpy.data.lights.new('linterna', 'SPOT'); ld.energy = 18; ld.spot_size = math.radians(45); ld.spot_blend = .6; ld.color = (1, .97, .9)
        lo = bpy.data.objects.new('linterna', ld); B.col().objects.link(lo); lo.location = mundo(n, c + d * .02)
        lo.rotation_euler = (ESCALERA - lo.location).to_track_quat('-Z', 'Y').to_euler()
    RP.sujetar(R[n]['per'], o, 'mano.D')
    # el señor del paraguas
    n = 'Señor'; s = R[n]['escala']; base_l = Vector((0, -.40, PISO[n] - .085))
    top_l = (paraguas('paraguas', mundo(n, base_l), .80, s) - R[n]['per'].arm.location) / s
    manos = {'D': dict(pos=tuple(top_l + Vector((-.075, .03, .005))), polo=(-.6, .5, -.5), dedos=(1, -.1, -.2), palma=(0, 0, -1), curl=.6),
             'I': dict(pos=tuple(top_l + Vector((.070, .03, .035))), polo=(.6, .5, -.5), dedos=(-1, -.1, -.2), palma=(0, 0, -1), curl=.45)}
    if not panico: R[n]['per'].pose(**sentado(PISO[n], cabeza=(2, -4, 0), brazos=manos, cara=cara('1-calma')))
    else: girar_hacia(n, ESCALERA, '4-alarma', brazos=manos)
    # el ejecutivo: al teléfono
    n = 'Ejecutivo'; per = R[n]['per']
    if not panico: per.pose(**sentado(PISO[n], cabeza=(0, 8, 0), cara=cara('3-duda', abre=.35, ancho=.9)))
    else: girar_hacia(n, ESCALERA, '5-miedo')
    d = dict(sentado(PISO[n], cabeza=(0, 8, 0), cara=cara('3-duda', abre=.35, ancho=.9))) if not panico else None
    br = dict(MANOS_S); br['D'] = brazo_oreja(per)
    if not panico: d['brazos'] = br; per.pose(**d)
    else: girar_hacia(n, ESCALERA, '5-miedo', brazos=br)
    ext = per.arm.matrix_world
    a, b = ext @ per.sigue('cabeza', (-.096, .012, 1.628)), ext @ per.sigue('cabeza', (-.090, -.085, 1.560))
    nrm = (ext @ per.sigue('cabeza', (0, -.01, 1.60))) - a
    RP.sujetar(per, telefono('tel_ejecutivo', (a + b) / 2 + nrm.normalized() * -.002, b - a, nrm, 1.0, False), 'cabeza')
    # el hombre de la venda: solo en la calma (en el pánico ya se lo llevaron)
    if not panico:
        n = 'Hombre'
        R[n]['per'].pose(**sentado(PISO[n], tronco=(6, 0, 0), cabeza=(24, -4, 0), cara=dict(parpado=.55, ceja=(-.002, -.002), ceja_int=(10, 10), abre=.12, ancho=.7),
                                   brazos={'D': dict(pos=(-.11, -.27, .585), polo=(-.5, .8, -.3), dedos=(.15, -1, -.12), palma=(0, 0, -1), curl=.12),
                                           'I': dict(pos=(-.02, -.26, .615), polo=(.5, .8, -.3), dedos=(-.9, -.4, -.1), palma=(0, 0, -1), curl=.7, pulgar=.6)}))
    else:
        for o in [R['Hombre']['per'].arm] + list(R['Hombre']['per'].arm.children_recursive): o.hide_render = True
    # extras
    if not panico:
        R['A']['per'].pose(**sentado(PISO['A'], cabeza=(4, 0, 0), cara=cara('1-calma')))
        R['B']['per'].pose(**sentado(PISO['B'], tronco=(-6, -4, -6), cabeza=(8, -16, -14), cara=dict(parpado=1.0)))
        tl = (0, -.27, .64)
        o, br = tel_en_manos('C', tl, (0, .02, 1.15), 'tel_c')
        R['C']['per'].pose(**sentado(PISO['C'], cabeza=(26, 0, 0), brazos=br, cara=cara('1-calma', parpado=.35, mirada=tl))); RP.sujetar(R['C']['per'], o, 'mano.D')
        R['D']['per'].pose(**sentado(PISO['D'], cabeza=(2, 34, 0), cara=cara('1-calma', mirada=ojos_a('D', (5, 3.2, 1.0)))))
        R['E']['per'].pose(**sentado(PISO['E'], cabeza=(3, -24, 0), cara=cara('1-calma', mirada=ojos_a('E', (-5, 3.8, 1.0)))))
        R['F']['per'].pose(**sentado(PISO['F'], cabeza=(6, -14, 0), cara=cara('1-calma')))
        R['G']['per'].pose(**sentado(PISO['G'], cabeza=(6, 0, 0), cara=cara('1-calma', parpado=.45)))
    else:
        for n, c in (('A', '5-miedo'), ('B', '4-alarma'), ('D', '4-alarma'), ('E', '5-miedo'), ('F', '4-alarma'), ('G', '5-miedo')):
            girar_hacia(n, ESCALERA, c, mano_respaldo=n in ('F', 'D'))
        o, br = tel_en_manos('C', (0, -.27, .64), (0, .02, 1.15), 'tel_c'); girar_hacia('C', ESCALERA, '5-miedo', brazos=br); RP.sujetar(R['C']['per'], o, 'mano.D')
    bpy.context.view_layer.update()

# ---------- cámaras: todas dentro del mismo mundo ----------
CAMS = {
    'general-frente': lambda: B.camara('general_frente', (.02, .22, 1.46), (.05, 6.6, .72), 15),
    'general-fondo': lambda: B.camara('general_fondo', (-.80, 8.75, 1.52), (-.20, 1.0, .80), 16),
    'owen-ventana': lambda: B.camara('owen_ventana', (-1.72, 2.30, 1.35), (-.95, 2.86, 1.13), 45, fstop=2.4, foco=(-.97, 2.80, 1.17)),
    'detras-de-owen': lambda: B.camara('detras', (-.28, 4.32, 1.42), (-.92, 2.70, .98), 26, fstop=4.0, foco=(-.93, 3.6, 1.15)),
    'escalera': lambda: B.camara('escalera', (-.05, 6.15, 1.60), (.72, 8.05, -.85), 18),
}

def planta(ruta):
    """Vista desde arriba sin techo, con los nombres en sus asientos (mapa de continuidad)."""
    for o in BUS['techo']: o.hide_render = True
    for k, m, lo in BUS['tubos']: m.hide_render = True
    cd = bpy.data.cameras.new('planta'); cd.type = 'ORTHO'; cd.ortho_scale = 9.6
    cam = bpy.data.objects.new('planta', cd); B.col().objects.link(cam); cam.location = (0, 4.5, 8); cam.rotation_euler = (0, 0, math.radians(90))
    sol = bpy.data.lights.new('cenital', 'AREA'); sol.size = 6; sol.energy = 1600
    so = bpy.data.objects.new('cenital', sol); B.col().objects.link(so); so.location = (0, 4.5, 4)
    S.camera = cam; B.preparar_render(1800, 480, 24 if args.rapido else 48, 0.4); S.render.filepath = ruta
    bpy.context.view_layer.update()
    from bpy_extras.object_utils import world_to_camera_view
    puntos = {}
    for n in RP.MAPA:
        per = R[n]['per']; h = per.arm.matrix_world @ per.pb('cabeza').head
        v = world_to_camera_view(S, cam, h); puntos[n] = (v.x, 1 - v.y)
    bpy.ops.render.render(write_still=True)
    for o in BUS['techo']: o.hide_render = False
    for k, m, lo in BUS['tubos']: m.hide_render = False
    so.hide_render = True
    return puntos

os.makedirs(args.out, exist_ok=True)
q = .5 if args.rapido else 1.0; ms = 12 if args.rapido else 40
tomas = [t for t in args.tomas.split(',') if t] or list(CAMS) + ['planta']
for estado in args.estados.split(','):
    A.luz(BUS, estado); posar(estado)
    if 'planta' in tomas and estado == 'calma':
        pts = planta(os.path.join(args.out, 'planta.jpg'))
        json.dump(pts, open(os.path.join(args.out, 'planta.json'), 'w'), ensure_ascii=False)
        print('LISTO planta', flush=True)
    for t in tomas:
        if t == 'planta': continue
        S.camera = CAMS[t](); B.preparar_render(int(1280 * q), int(720 * q), ms, 0.7 if estado == 'calma' else 0.9)
        S.render.filepath = os.path.join(args.out, f'{estado}-{t}.jpg')
        t0 = time.time(); bpy.ops.render.render(write_still=True); print(f'LISTO {estado}-{t} {time.time() - t0:.0f}s', flush=True)

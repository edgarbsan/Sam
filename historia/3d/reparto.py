# Autor: BS
# El reparto del piso de arriba y el mapa de asientos único (continuidad).
# Todos usan el mismo esqueleto de Owen; cambian ropa, pelo, accesorios, tamaño y piel.
import bpy, bmesh, math, random
from mathutils import Vector, Matrix
import base3d as B
from base3d import mat, capsula, elipsoide, cadena, anillo
from personaje import Personaje, owen, OJO_X, OJO_Y, OJO_Z, BOCA
import autobus as A

def lin(h):
    """Color hexadecimal (sRGB) a color lineal de Blender."""
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c)

PIELES = dict(clara=(0.68, 0.57, 0.50), media=(0.50, 0.35, 0.25), morena=(0.30, 0.19, 0.13), oscura=(0.16, 0.10, 0.07),
              palida=(0.56, 0.58, 0.51))

def materiales(n, piel, playera, chamarra, pantalon, pelo, zapato=(0.03, 0.03, 0.032), sudor=False, fem=False, **extra):
    c = dict(piel=mat(f'{n}_piel', PIELES[piel], 0.36 if sudor else 0.74, bump=.35, escala=900, motas=.06, escala_motas=40),
             playera=mat(f'{n}_playera', playera, 0.94, sheen=.25, bump=.9, escala=1100, motas=.16),
             chamarra=mat(f'{n}_chamarra', chamarra, 0.96, sheen=.3, bump=1.0, escala=1000, motas=.22),
             pantalon=mat(f'{n}_pantalon', pantalon, 0.95, sheen=.2, bump=.9, escala=1000, motas=.2),
             zapato=mat(f'{n}_zapato', zapato, 0.8, bump=.4), suela=mat(f'{n}_suela', (0.30, 0.29, 0.27), 0.8),
             pelo=mat(f'{n}_pelo', pelo, 0.62, sheen=.07, bump=.7, escala=1400, motas=.3, escala_motas=200),
             ojo=mat(f'{n}_ojo', (0.90, 0.89, 0.86), 0.25, emit=(1, 1, 1), strength=0.10), iris=mat(f'{n}_iris', (0.008, 0.007, 0.006), 0.12),
             labio=mat(f'{n}_labio', tuple(v * f for v, f in zip(PIELES[piel], (.80, .52, .52) if fem else (.78, .78, .78))), 0.55 if fem else 0.7, bump=.3, escala=900),
             labio_linea=mat(f'{n}_labio_linea', tuple(v * .3 for v in PIELES[piel]), 0.7), boca=mat(f'{n}_boca', (0.02, 0.008, 0.008), 0.6))
    for k, v in extra.items(): c[k] = mat(f'{n}_{k}', v[0], v[1]) if isinstance(v, tuple) and isinstance(v[0], tuple) else v
    return c

# ---------- pelo y accesorios ----------
C_CAB, R_CAB = Vector((0, -.002, 1.63)), Vector((.0850, .0990, .1225))

def pelo(frente=1.694, nuca=1.598, semilla=7, n=46, calvo=False, chongo=False, coleta=False, mechon=False, largo=None):
    """largo: altura (m) a la que llegan los mechones de los lados y de atrás, para pelo a la quijada o más."""
    def f(p):
        def cap(bm):
            vs = elipsoide(bm, C_CAB, R_CAB, 40, 28)
            borra = {v for v in vs if (v.co.z < frente + .004 and v.co.y < .012) or v.co.z < nuca}
            if calvo: borra |= {v for v in vs if v.co.z > 1.672 or (v.co.y < .02 and v.co.z > 1.62)}
            bmesh.ops.delete(bm, geom=list(borra), context='VERTS')
            rnd = random.Random(semilla)
            def punto(az, pol, lift):
                return Vector((C_CAB.x + R_CAB.x * lift * math.sin(pol) * math.sin(az), C_CAB.y - R_CAB.y * lift * math.sin(pol) * math.cos(az), C_CAB.z + R_CAB.z * lift * math.cos(pol)))
            for k in range(n):
                az = 2 * math.pi * (k + rnd.uniform(-.3, .3)) / n; adelante = abs((az + math.pi) % (2 * math.pi) - math.pi) < math.radians(72)
                if calvo and adelante: continue
                fin = math.acos(max(-1, min(1, ((frente if adelante else nuca) - C_CAB.z) / R_CAB.z))) + rnd.uniform(-.03, .03)
                ini = math.acos((1.66 - C_CAB.z) / R_CAB.z) if calvo else rnd.uniform(.05, .22)
                lift = rnd.uniform(1.012, 1.045); deriva = rnd.uniform(-.16, .16); pasos = 6
                if largo and not adelante:
                    fin = math.radians(98)
                pts = [punto(az + deriva * (j / pasos), ini + (fin - ini) * j / pasos, lift) for j in range(pasos + 1)]
                if largo and not adelante:  # cae recto hacia abajo, un poco hacia afuera
                    ult = pts[-1]; fuera = Vector((ult.x - C_CAB.x, ult.y - C_CAB.y, 0)).normalized()
                    caida = ult.z - largo + rnd.uniform(-.012, .012)
                    pts += [ult + fuera * (.010 * k / 3) - Vector((0, 0, caida * k / 3)) for k in (1, 2, 3)]
                cadena(bm, pts, rnd.uniform(.013, .017), rnd.uniform(.0085, .011) if adelante else rnd.uniform(.006, .009), 8)
            if chongo: elipsoide(bm, (0, .112, 1.680), (.042, .036, .040), 16, 10)
            if coleta:
                elipsoide(bm, (0, .104, 1.665), (.022, .020, .022), 12, 8)
                cadena(bm, [(0, .112, 1.66), (0, .135, 1.61), (0, .140, 1.55), (0, .132, 1.49)], .024, .009, 10)
            if mechon:
                for dx in (-.03, 0, .03): cadena(bm, [(dx, -.03, 1.740), (dx * 1.2, -.055, 1.755), (dx * 1.3, -.075, 1.745)], .012, .005, 8)
        p.parte('cabeza', p.c['pelo'], cap)
    return f

def gorro(p, m):
    """Gorro de lana: casco sobre la cabeza con borde doblado."""
    def g(bm):
        vs = elipsoide(bm, C_CAB + Vector((0, 0, .004)), R_CAB * 1.075, 36, 24)
        bmesh.ops.delete(bm, geom=[v for v in vs if v.co.z < 1.672], context='VERTS')
        pts = [(R_CAB.x * 1.10 * math.sin(a), C_CAB.y - R_CAB.y * 1.10 * math.cos(a), 1.676) for a in [2 * math.pi * k / 30 for k in range(31)]]
        cadena(bm, pts, .014, .014, 10)
    p.parte('cabeza', m, g)

def lentes(p, m):
    def g(bm):
        for sx in (1, -1):
            c = Vector((sx * OJO_X, -.109, OJO_Z))
            cadena(bm, [c + Vector((.020 * math.cos(a), 0, .016 * math.sin(a))) for a in [2 * math.pi * k / 20 for k in range(21)]], .0018, .0018, 6)
            cadena(bm, [c + Vector((sx * .020, 0, .004)), Vector((sx * .084, -.06, 1.640)), Vector((sx * .084, .02, 1.632))], .0016, .0016, 6)
        cadena(bm, [(-.013, -.110, 1.638), (0, -.113, 1.642), (.013, -.110, 1.638)], .0018, .0018, 6)
    p.parte('cabeza', m, g)

def bigote(p, m):
    p.parte('cabeza', m, lambda bm: cadena(bm, [(-.025, -.086, 1.566), (-.013, -.0955, 1.577), (0, -.0975, 1.579), (.013, -.0955, 1.577), (.025, -.086, 1.566)], .0055, .0055, 8))

def barba(p, m):
    def g(bm):
        vs = elipsoide(bm, (0, -.030, 1.552), (.074, .074, .064), 28, 18)
        bmesh.ops.delete(bm, geom=[v for v in vs if v.co.z > 1.585 or v.co.y > .02 or (abs(v.co.x) < .028 and v.co.z > 1.535 and v.co.y < -.05)], context='VERTS')
    p.parte('cabeza', m, g)

def bufanda(p, m):
    def g(bm):
        cadena(bm, [(.075 * math.sin(a), .004 - .066 * math.cos(a), 1.452 + .01 * math.cos(a)) for a in [2 * math.pi * k / 24 for k in range(25)]], .027, .027, 10)
        cadena(bm, [(.035, -.075, 1.43), (.045, -.108, 1.36), (.050, -.118, 1.26), (.052, -.114, 1.18)], .022, .018, 10)
    p.parte('pecho', m, g)

def capucha(p, m):
    p.parte('pecho', m, lambda bm: (elipsoide(bm, (0, .085, 1.445), (.115, .062, .062), 20, 12),
                                    capsula(bm, (.03, -.08, 1.42), (.035, -.115, 1.30), .004, .004, 6), capsula(bm, (-.03, -.08, 1.42), (-.035, -.115, 1.30), .004, .004, 6)))

def corbata(p, m):
    p.parte('pecho', m, lambda bm: (elipsoide(bm, (0, -.090, 1.425), (.014, .010, .012), 10, 6), cadena(bm, [(0, -.093, 1.415), (0, -.107, 1.33), (0, -.106, 1.21), (0, -.100, 1.12)], .009, .014, 8)))

def ojeras(p, m):
    for sx in (1, -1):
        eye = Vector((sx * OJO_X, OJO_Y, OJO_Z))
        p.parte('cabeza', m, lambda bm: cadena(bm, [eye + Vector((.0175 * math.sin(a), -.0182 * math.cos(a) - .001, -.0128 - .002 * math.cos(a))) for a in [math.radians(-60 + 120 * k / 8) for k in range(9)]], .0028, .0028, 6))

def venda(p, mv, ms):
    """Venda de gasa enrollada en la mano derecha, con cinta y sangre que traspasa."""
    hx, hy = -.195, -.012
    def g(bm):
        for k in range(8):
            z = .792 + k * .0105; t = .06 * (1 if k % 2 else -1)
            cadena(bm, [Vector((hx + .0185 * math.cos(a), hy - .004 + .045 * math.sin(a), z + t * math.sin(a))) for a in [2 * math.pi * j / 18 for j in range(19)]], .0058, .0058, 6)
        cadena(bm, [Vector((hx + .022 * math.cos(a), hy - .004 + .048 * math.sin(a), .862)) for a in [2 * math.pi * j / 18 for j in range(19)]], .0062, .0062, 6)
    p.parte('mano.D', mv, g)
    p.parte('mano.D', ms, lambda bm: (elipsoide(bm, (hx + .021, hy - .006, .823), (.004, .020, .016), 12, 8), elipsoide(bm, (hx + .020, hy + .012, .838), (.004, .009, .008), 10, 6)))

def curita(p, m):
    """Curita en el índice de la mano derecha (madre)."""
    def g(bm):
        a = Vector((-.195, -.012 - .028, .765 - .072 * .30))
        cadena(bm, [a + Vector((.0098 * math.cos(t), .0098 * math.sin(t), 0)) for t in [2 * math.pi * j / 14 for j in range(15)]], .0042, .0042, 6)
    p.parte('dedo0a.D', m, g)

# ---------- el reparto ----------
def _escala(c, f): return f

REPARTO = {}   # nombre -> dict(per, escala)

def crear(nombre, c, pelo_fn=None, extras=(), escala=1.0, cabeza=1.0, ceja=1.0):
    eh = {'cabeza': cabeza} if cabeza != 1.0 else None
    per = Personaje(nombre, c, pelo=pelo_fn, escala_huesos=eh, ceja=ceja)
    for e in extras: e(per)
    per.arm.scale = (escala, escala, escala)
    REPARTO[nombre] = dict(per=per, escala=escala)
    return per

def construir_reparto(con_hombre=True):
    REPARTO.clear()
    REPARTO['Owen'] = dict(per=owen(), escala=1.0)
    c = materiales('madre', 'media', lin('#CFC8C0'), lin('#5C5F4A'), lin('#26221F'), (0.030, 0.016, 0.010), fem=True, bufanda=((0.32, 0.12, 0.10), 0.95), curita=((0.75, 0.55, 0.40), 0.6))
    crear('Madre', c, pelo(frente=1.700, nuca=1.585, semilla=3, n=60, largo=1.455), (lambda p: bufanda(p, p.c['bufanda']), lambda p: curita(p, p.c['curita'])), .945, ceja=.7)
    c = materiales('hijo', 'media', lin('#E9E6E1'), lin('#D8B64A'), lin('#2F3A46'), (0.040, 0.022, 0.012))
    crear('Hijo', c, pelo(frente=1.690, nuca=1.600, semilla=5), (), .58, cabeza=1.36)
    c = materiales('adolescente', 'morena', lin('#2A2E33'), lin('#44566B'), lin('#1C1E22'), (0.012, 0.010, 0.010))
    crear('Adolescente', c, pelo(frente=1.700, nuca=1.600, semilla=9, n=52), (lambda p: capucha(p, p.c['chamarra']),), .985)
    c = materiales('senor', 'clara', lin('#B9B2AA'), lin('#8A6A52'), lin('#3A3530'), (0.30, 0.29, 0.28), lente=((0.02, 0.02, 0.02), 0.3))
    crear('Señor', c, pelo(frente=1.69, nuca=1.585, semilla=13, calvo=True), (lambda p: bigote(p, p.c['pelo']), lambda p: lentes(p, p.c['lente'])), .965)
    c = materiales('ejecutivo', 'clara', lin('#E9E6E1'), lin('#2F3A46'), lin('#232A33'), (0.010, 0.009, 0.008), corbata=(lin('#3E6F8E'), 0.6), telefono=((0.02, 0.02, 0.022), 0.3))
    crear('Ejecutivo', c, pelo(frente=1.715, nuca=1.600, semilla=17, n=40), (lambda p: corbata(p, p.c['corbata']),), 1.0)
    if con_hombre:
        c = materiales('hombre', 'palida', lin('#4A4C44'), (0.07, 0.085, 0.06), (0.02, 0.02, 0.022), (0.20, 0.16, 0.10), sudor=True,
                       gasa=((0.78, 0.76, 0.70), 0.95), sangre=((0.10, 0.006, 0.006), 0.3), ojera=((0.20, 0.17, 0.17), 0.8))
        crear('Hombre', c, pelo(frente=1.705, nuca=1.600, semilla=21, n=38), (lambda p: venda(p, p.c['gasa'], p.c['sangre']), lambda p: ojeras(p, p.c['ojera'])), .99)
    # extras: gente común del vuelo nocturno
    crear('A', materiales('a', 'clara', lin('#6E6A66'), lin('#5A2A2E'), lin('#2A2626'), (0.28, 0.27, 0.27), fem=True), pelo(frente=1.70, nuca=1.62, semilla=31, chongo=True), (), .93, ceja=.7)
    c = materiales('b', 'oscura', lin('#3A3D42'), lin('#4A4D52'), lin('#1E2024'), (0.008, 0.007, 0.007), gorro=((0.02, 0.02, 0.022), 0.95))
    crear('B', c, pelo(frente=1.69, nuca=1.62, semilla=33, n=30), (lambda p: gorro(p, p.c['gorro']),), 1.01)
    crear('C', materiales('c', 'media', lin('#2B2B2B'), lin('#9A8A72'), lin('#202020'), (0.008, 0.007, 0.007), fem=True), pelo(frente=1.70, nuca=1.59, semilla=35, coleta=True), (), .95, ceja=.7)
    crear('D', materiales('d', 'clara', lin('#9AA0A6'), lin('#1F2A3A'), lin('#2A2D33'), (0.33, 0.32, 0.31)), pelo(frente=1.69, nuca=1.585, semilla=37, calvo=True), (), 1.0)
    crear('E', materiales('e', 'morena', lin('#5C3A40'), lin('#3B3F36'), lin('#25262A'), (0.020, 0.011, 0.008), fem=True), pelo(frente=1.70, nuca=1.575, semilla=39, n=60, largo=1.43), (), .95, ceja=.7)
    c = materiales('f', 'morena', lin('#6A6F75'), lin('#2E2B29'), lin('#1D1E21'), (0.012, 0.009, 0.008))
    crear('F', c, pelo(frente=1.712, nuca=1.60, semilla=41, n=36), (lambda p: barba(p, p.c['pelo']),), 1.02)
    c = materiales('g', 'clara', lin('#C9C3BA'), lin('#4F5A4F'), lin('#2A2A2E'), (0.20, 0.10, 0.05), fem=True, gorro=(lin('#7A2E2A'), 0.95), bufanda=(lin('#C9B48A'), 0.95))
    crear('G', c, pelo(frente=1.69, nuca=1.58, semilla=43, n=56, largo=1.47), (lambda p: gorro(p, p.c['gorro']), lambda p: bufanda(p, p.c['bufanda'])), .96, ceja=.7)
    return REPARTO

# ---------- mapa de asientos único (fila 1 al frente; V: lado de la pista, E: lado de la escalera; 0 ventana, 1 pasillo) ----------
MAPA = {
    'Madre': (1, 'V', 0), 'Hijo': (1, 'V', 1), 'A': (1, 'E', 0),
    'B': (2, 'V', 0), 'Adolescente': (2, 'E', 0), 'C': (2, 'E', 1),
    'Owen': (3, 'V', 0), 'Señor': (3, 'V', 1), 'D': (3, 'E', 0), 'Ejecutivo': (3, 'E', 1),
    'Hombre': (4, 'V', 0),
    'E': (5, 'V', 0), 'F': (5, 'V', 1),
    'G': (6, 'E', 0),
}
NOMBRES = {'Owen': 'Owen', 'Madre': 'La madre', 'Hijo': 'Su hijo', 'Adolescente': 'El adolescente', 'Señor': 'El señor del paraguas',
           'Ejecutivo': 'El ejecutivo', 'Hombre': 'El hombre de la venda', 'A': 'Señora', 'B': 'Joven dormido', 'C': 'Joven con celular',
           'D': 'Señor calvo', 'E': 'Pareja (ella)', 'F': 'Pareja (él)', 'G': 'Mujer de gorro'}

def colocar(nombre):
    """Sienta al personaje en su asiento del mapa. Devuelve la altura del piso en el espacio de su esqueleto."""
    r = REPARTO[nombre]; per, s = r['per'], r['escala']
    P = A.asiento(*MAPA[nombre])
    loc = P - s * Vector((0, .26, .40)); per.arm.location = loc; bpy.context.view_layer.update()
    return (0 - loc.z) / s + .085

def a_local(nombre, p):
    """Punto del mundo al espacio del esqueleto de ese personaje (para miradas y manos)."""
    r = REPARTO[nombre]; return (Vector(p) - r['per'].arm.location) / r['escala']

def sujetar(per, obj, hueso):
    """Pega un objeto a un hueso conservando dónde está ahora (sigue a la mano en la animación)."""
    bpy.context.view_layer.update()
    mw = obj.matrix_world.copy(); pb = per.pb(hueso)
    obj.parent = per.arm; obj.parent_type = 'BONE'; obj.parent_bone = hueso
    obj.matrix_parent_inverse = (per.arm.matrix_world @ pb.matrix @ Matrix.Translation((0, pb.length, 0))).inverted()
    obj.matrix_world = mw

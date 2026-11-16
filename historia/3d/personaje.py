# Autor: BS
# Personaje con esqueleto: proporción humana (1.76 m), manos con cinco dedos, cara con ojos, párpados, cejas y boca.
# Mira hacia -y. Su izquierda es +x (sufijo .I); su derecha es -x (sufijo .D).
# Las poses se resuelven con huesos de largo fijo; codos y rodillas doblan como bisagra.
import bpy, bmesh, math
from mathutils import Vector, Matrix
from base3d import mat, terminar, capsula, elipsoide, col

R = math.radians
LADOS = (('I', 1), ('D', -1))
OJO_Z, OJO_X, OJO_Y = 1.634, 0.033, -0.079
BOCA = Vector((0, -0.083, 1.557))
DEDOS = [(-0.028, 0.072), (-0.009, 0.080), (0.010, 0.074), (0.027, 0.058)]  # índice, medio, anular, meñique

def huesos():
    H = [('cadera', (0, 0, .94), (0, 0, 1.04), None, (0, -1, 0)), ('columna', (0, 0, 1.04), (0, 0, 1.20), 'cadera', (0, -1, 0)),
         ('pecho', (0, 0, 1.20), (0, 0, 1.43), 'columna', (0, -1, 0)), ('cuello', (0, 0, 1.43), (0, 0, 1.50), 'pecho', (0, -1, 0)),
         ('cabeza', (0, 0, 1.50), (0, 0, 1.74), 'cuello', (0, -1, 0)),
         ('boca', tuple(BOCA), tuple(BOCA + Vector((0, -.02, 0))), 'cabeza', (0, 0, 1))]
    for s, sx in LADOS:
        hx, hy = sx * .195, -.012
        H += [(f'brazo.{s}', (sx * .176, 0, 1.395), (sx * .195, .012, 1.11), 'pecho', (0, 1, 0)),
              (f'antebrazo.{s}', (sx * .195, .012, 1.11), (hx, hy, .855), f'brazo.{s}', (0, 1, 0)),
              (f'mano.{s}', (hx, hy, .855), (hx, hy, .765), f'antebrazo.{s}', (0, 1, 0)),
              (f'muslo.{s}', (sx * .09, 0, .93), (sx * .09, -.015, .50), 'cadera', (0, 1, 0)),
              (f'pierna.{s}', (sx * .09, -.015, .50), (sx * .09, 0, .085), f'muslo.{s}', (0, 1, 0)),
              (f'pie.{s}', (sx * .09, 0, .085), (sx * .09, -.19, .02), f'pierna.{s}', (0, 0, -1))]
        rv = (-sx, 0, 0)
        for i, (dy, L) in enumerate(DEDOS):
            a, b, c = (hx, hy + dy, .765), (hx, hy + dy, .765 - L * .55), (hx, hy + dy, .765 - L)
            H += [(f'dedo{i}a.{s}', a, b, f'mano.{s}', rv), (f'dedo{i}b.{s}', b, c, f'dedo{i}a.{s}', rv)]
        p0 = Vector((hx, hy - .034, .835)); d = Vector((0, -.5, -.87)).normalized()
        H += [(f'pulgar_a.{s}', tuple(p0), tuple(p0 + d * .034), f'mano.{s}', rv), (f'pulgar_b.{s}', tuple(p0 + d * .034), tuple(p0 + d * .062), f'pulgar_a.{s}', rv)]
        eye = Vector((sx * OJO_X, OJO_Y, OJO_Z)); f = Vector((0, -.02, 0))
        H += [(f'ojo.{s}', tuple(eye), tuple(eye + f), 'cabeza', (0, 0, 1)), (f'parpado.{s}', tuple(eye), tuple(eye + f), 'cabeza', (0, 0, 1)),
              (f'ceja.{s}', (sx * .034, -.090, 1.668), (sx * .034, -.110, 1.668), 'cabeza', (0, 0, 1)),
              (f'comisura.{s}', tuple(BOCA), tuple(BOCA + f), 'cabeza', (0, 0, 1))]
    return H

class Personaje:
    def __init__(self, nombre, c, pelo=None, extra=None):
        """c: materiales piel, playera, chamarra, pantalon, zapato, suela, pelo, ojo, iris, labio, boca."""
        self.nombre = nombre; self.c = c
        ad = bpy.data.armatures.new(nombre + '_esq'); arm = bpy.data.objects.new(nombre, ad); col().objects.link(arm)
        self.arm, self.ad = arm, ad
        bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
        for n, h, t, p, rv in huesos():
            b = ad.edit_bones.new(n); b.head = h; b.tail = t; b.align_roll(Vector(rv))
            if p: b.parent = ad.edit_bones[p]
        bpy.ops.object.mode_set(mode='OBJECT')
        self.rest = {b.name: b.matrix_local.copy() for b in ad.bones}
        self.largo = {b.name: b.length for b in ad.bones}
        for pb in arm.pose.bones: pb.rotation_mode = 'XYZ'
        self.mirada = bpy.data.objects.new(nombre + '_mirada', None); col().objects.link(self.mirada); self.mirada.parent = arm
        for s, _ in LADOS:
            k = arm.pose.bones[f'ojo.{s}'].constraints.new('DAMPED_TRACK'); k.target = self.mirada; k.track_axis = 'TRACK_Y'
        self._malla(c, pelo, extra)
        self.reposo()

    # ----- construcción de la malla: piezas rígidas pegadas a cada hueso -----
    def parte(self, hueso, material, fn, smooth=True):
        bm = bmesh.new(); fn(bm); o = terminar(bm, f'{self.nombre}_{hueso}', material, smooth)
        bo = self.ad.bones[hueso]; o.parent = self.arm; o.parent_type = 'BONE'; o.parent_bone = hueso
        o.matrix_parent_inverse = (self.arm.matrix_world @ bo.matrix_local @ Matrix.Translation((0, bo.length, 0))).inverted()
        return o

    def _malla(self, c, pelo, extra):
        P = self.parte
        P('cadera', c['pantalon'], lambda bm: elipsoide(bm, (0, 0, .975), (.158, .112, .125)))
        P('columna', c['playera'], lambda bm: elipsoide(bm, (0, 0, 1.10), (.138, .095, .13)))
        P('pecho', c['playera'], lambda bm: (elipsoide(bm, (0, 0, 1.285), (.146, .100, .165)), elipsoide(bm, (0, -.004, 1.447), (.060, .056, .020))))
        def chamarra(bm):
            elipsoide(bm, (0, .004, 1.20), (.170, .121, .33), 40, 28)
            def corta(co, no, **k):
                g = bm.verts[:] + bm.edges[:] + bm.faces[:]
                bmesh.ops.bisect_plane(bm, geom=g, dist=1e-6, plane_co=co, plane_no=no, **k)
            corta((0, 0, .935), (0, 0, -1), clear_outer=True)   # bajo de la chamarra
            corta((0, 0, 1.44), (0, 0, 1), clear_outer=True)    # abertura del cuello
            corta((.05, 0, 0), (1, 0, 0)); corta((-.05, 0, 0), (1, 0, 0))
            quita = [f for f in bm.faces if abs(f.calc_center_median().x) < .05 and f.calc_center_median().y < 0 and f.calc_center_median().z < 1.425]
            bmesh.ops.delete(bm, geom=quita, context='FACES')
            for sx in (1, -1):
                capsula(bm, (sx * .050, .012, 1.452), (sx * .172, .004, 1.408), .040, .052, 14)  # trapecio y hombro
                elipsoide(bm, (sx * .046, -.030, 1.458), (.030, .040, .016), 12, 8)  # cuello de la chamarra
        P('pecho', c['chamarra'], chamarra)
        P('cuello', c['piel'], lambda bm: capsula(bm, (0, .008, 1.42), (0, .002, 1.54), .049, .046))
        def cabeza(bm):
            cz, rz = 1.615, .115
            for v in elipsoide(bm, (0, -.006, cz), (.083, .095, rz), 36, 24):
                if v.co.z < cz:
                    f = 1 - .16 * ((cz - v.co.z) / rz) ** 1.6; v.co.x *= f; v.co.y = -.006 + (v.co.y + .006) * f
            elipsoide(bm, (0, -.101, 1.607), (.0105, .015, .023), 12, 8)
            for sx in (1, -1): elipsoide(bm, (sx * .080, .006, 1.622), (.008, .016, .024), 12, 8)
        P('cabeza', c['piel'], cabeza)
        for s, sx in LADOS:
            eye = Vector((sx * OJO_X, OJO_Y, OJO_Z))
            P(f'ojo.{s}', c['ojo'], lambda bm: elipsoide(bm, eye, (.0172, .0172, .0172), 24, 14))
            P(f'ojo.{s}', c['iris'], lambda bm: elipsoide(bm, eye + Vector((0, -.0142, 0)), (.0082, .0036, .0082), 18, 8))
            def parp(bm):
                vs = elipsoide(bm, eye, (.0190, .0190, .0190), 28, 18)
                bmesh.ops.delete(bm, geom=[v for v in vs if v.co.z < eye.z + .0062 or v.co.y > eye.y + .007], context='VERTS')
            P(f'parpado.{s}', c['piel'], parp)
            P(f'ceja.{s}', c['pelo'], lambda bm: capsula(bm, (sx * .013, -.0935, 1.668), (sx * .054, -.083, 1.667), .0046, .0036, 10))
            P(f'comisura.{s}', c['labio'], lambda bm: capsula(bm, tuple(BOCA + Vector((0, -.0008, 0))), (sx * .021, -.0772, BOCA.z), .0028, .0022, 10))
        P('boca', c['boca'], lambda bm: elipsoide(bm, BOCA + Vector((0, .002, -.001)), (.016, .006, .012), 16, 10))
        for s, sx in LADOS:
            hx, hy = sx * .195, -.012
            P(f'brazo.{s}', c['chamarra'], lambda bm: capsula(bm, (sx * .176, 0, 1.395), (sx * .195, .012, 1.11), .052, .044))
            P(f'antebrazo.{s}', c['chamarra'], lambda bm: (capsula(bm, (sx * .195, .012, 1.11), (hx, hy, .875), .044, .034), capsula(bm, (hx, hy, .890), (hx, hy, .866), .037, .037)))
            P(f'mano.{s}', c['piel'], lambda bm: (elipsoide(bm, (hx, hy - .004, .812), (.0125, .040, .050), 16, 10), capsula(bm, (hx, hy, .856), (hx, hy, .842), .021, .021, 12)))
            for i, (dy, L) in enumerate(DEDOS):
                a, b, cc = Vector((hx, hy + dy, .765)), Vector((hx, hy + dy, .765 - L * .55)), Vector((hx, hy + dy, .765 - L))
                P(f'dedo{i}a.{s}', c['piel'], lambda bm: capsula(bm, a, b, .0088, .0078, 10))
                P(f'dedo{i}b.{s}', c['piel'], lambda bm: capsula(bm, b, cc, .0078, .0064, 10))
            p0 = Vector((hx, hy - .034, .835)); d = Vector((0, -.5, -.87)).normalized()
            P(f'pulgar_a.{s}', c['piel'], lambda bm: capsula(bm, p0, p0 + d * .034, .0120, .0105, 10))
            P(f'pulgar_b.{s}', c['piel'], lambda bm: capsula(bm, p0 + d * .034, p0 + d * .062, .0105, .0086, 10))
            P(f'muslo.{s}', c['pantalon'], lambda bm: capsula(bm, (sx * .09, 0, .93), (sx * .09, -.015, .50), .080, .058))
            P(f'pierna.{s}', c['pantalon'], lambda bm: capsula(bm, (sx * .09, -.015, .50), (sx * .09, 0, .10), .055, .042))
            P(f'pie.{s}', c['zapato'], lambda bm: elipsoide(bm, (sx * .09, -.072, .048), (.047, .128, .046)))
            P(f'pie.{s}', c['suela'], lambda bm: elipsoide(bm, (sx * .09, -.072, .014), (.049, .132, .015)))
        if pelo: pelo(self)
        if extra: extra(self)

    # ----- poses -----
    def pb(self, n): return self.arm.pose.bones[n]
    def act(self): bpy.context.view_layer.update()
    def sigue(self, hueso, p_reposo):
        """Punto dado en reposo, llevado a donde está ahora ese hueso (espacio del esqueleto)."""
        return self.pb(hueso).matrix @ self.rest[hueso].inverted() @ Vector(p_reposo)

    def _orienta(self, n, origen, y, xref):
        y = Vector(y).normalized(); x = Vector(xref); x = x - y * x.dot(y)
        x = x.normalized() if x.length > 1e-6 else y.orthogonal().normalized()
        M = Matrix((x, y, x.cross(y))).transposed().to_4x4(); M.translation = origen
        self.pb(n).matrix = M; self.act()

    @staticmethod
    def _ik(S, T, l1, l2, polo):
        d = T - S; D = max(min(d.length, (l1 + l2) * .999), abs(l1 - l2) * 1.001); u = d.normalized()
        a = (l1 * l1 - l2 * l2 + D * D) / (2 * D); h = math.sqrt(max(l1 * l1 - a * a, 0.0))
        p = Vector(polo); p = p - u * p.dot(u); p = p.normalized() if p.length > 1e-6 else u.orthogonal().normalized()
        return S + u * a + p * h, S + u * D

    def reposo(self):
        for pb in self.arm.pose.bones:
            pb.matrix_basis = Matrix.Identity(4)
        self.pb('boca').scale = (1, 1, .06)
        self.mirada.location = (0, -6, OJO_Z); self.act()

    def brazo(self, s, pos=None, polo=None, dedos=None, palma=None, curl=.22, indice=None, pulgar=None):
        sx = 1 if s == 'I' else -1
        S = self.pb(f'brazo.{s}').head.copy(); l1, l2 = self.largo[f'brazo.{s}'], self.largo[f'antebrazo.{s}']
        T = Vector(pos) if pos is not None else S + Vector((sx * .03, -.03, -(l1 + l2) * .99))
        polo = Vector(polo) if polo is not None else Vector((sx * .35, .9, -.2))
        E, W = self._ik(S, T, l1, l2, polo)
        n = (E - S).cross(W - E); n = n if n.length > 1e-6 else polo.cross(W - S)
        self._orienta(f'brazo.{s}', S, E - S, n)
        self._orienta(f'antebrazo.{s}', self.pb(f'antebrazo.{s}').head.copy(), W - E, n)
        f = Vector(dedos) if dedos is not None else (W - E)
        p = Vector(palma) if palma is not None else Vector((-sx, 0, 0))
        self._orienta(f'mano.{s}', self.pb(f'mano.{s}').head.copy(), f, p * -sx)
        for i in range(4):
            k = curl if (indice is None or i > 0) else indice
            self.pb(f'dedo{i}a.{s}').rotation_euler = (k * 1.25, 0, 0); self.pb(f'dedo{i}b.{s}').rotation_euler = (k * 1.45, 0, 0)
        kp = curl if pulgar is None else pulgar
        self.pb(f'pulgar_a.{s}').rotation_euler = (kp * .6, 0, 0); self.pb(f'pulgar_b.{s}').rotation_euler = (kp * .9, 0, 0)
        self.act()

    def pierna(self, s, pos=None, polo=None, punta=None):
        sx = 1 if s == 'I' else -1
        Hp = self.pb(f'muslo.{s}').head.copy(); l1, l2 = self.largo[f'muslo.{s}'], self.largo[f'pierna.{s}']
        T = Vector(pos) if pos is not None else Vector((sx * .09, 0, .085))
        polo = Vector(polo) if polo is not None else Vector((sx * .12, -1, .1))
        K, A = self._ik(Hp, T, l1, l2, polo)
        n = (K - Hp).cross(A - K); n = n if n.length > 1e-6 else Vector((1, 0, 0))
        self._orienta(f'muslo.{s}', Hp, K - Hp, n)
        self._orienta(f'pierna.{s}', self.pb(f'pierna.{s}').head.copy(), A - K, n)
        q = Vector((0, -1, 0)).rotation_difference(Vector(punta).normalized()) if punta is not None else None
        t = Vector((0, -.19, -.065)); lado = Vector((1, 0, 0))
        if q is not None: t = q @ t; lado = q @ lado
        self._orienta(f'pie.{s}', self.pb(f'pie.{s}').head.copy(), t, lado)

    def cara(self, parpado=.12, ceja=(0, 0), ceja_int=(0, 0), comisura=(0, 0), abre=0.0, ancho=1.0, mirada=None):
        """parpado 0 abierto, 1 cerrado. ceja: subir (m). ceja_int: subir el extremo interior (grados). comisura: grados hacia arriba."""
        for i, (s, sx) in enumerate(LADOS):
            self.pb(f'parpado.{s}').rotation_euler = (-R(parpado * (78 if parpado >= 0 else 95)), 0, 0)
            self.pb(f'ceja.{s}').location = (0, 0, ceja[i]); self.pb(f'ceja.{s}').rotation_euler = (0, -sx * R(ceja_int[i]), 0)
            self.pb(f'comisura.{s}').rotation_euler = (0, sx * R(comisura[i]), 0)
        self.pb('boca').scale = (ancho, 1, max(.06, abre))
        if mirada is not None: self.mirada.location = mirada
        self.act()

    def pose(self, cadera=(0, 0, 0), cadera_flex=0, tronco=(0, 0, 0), cabeza=(0, 0, 0), brazos=None, piernas=None, cara=None):
        """tronco y cabeza: (flexión hacia adelante, giro a su izquierda, inclinación lateral) en grados."""
        self.reposo()
        c = self.pb('cadera'); c.location = (cadera[0], cadera[2], -cadera[1]); c.rotation_euler = (R(cadera_flex), 0, 0)
        fl, gi, la = tronco
        self.pb('columna').rotation_euler = (R(fl * .45), R(gi * .45), R(la * .5)); self.pb('pecho').rotation_euler = (R(fl * .55), R(gi * .55), R(la * .5))
        fl, gi, la = cabeza
        self.pb('cuello').rotation_euler = (R(fl * .35), R(gi * .3), R(la * .4)); self.pb('cabeza').rotation_euler = (R(fl * .65), R(gi * .7), R(la * .6))
        self.act()
        for s, _ in LADOS:
            self.pierna(s, **((piernas or {}).get(s, {})))
            self.brazo(s, **((brazos or {}).get(s, {})))
        self.cara(**(cara or {}))

# ----- Owen -----
def materiales_owen():
    return dict(piel=mat('o_piel', (0.63, 0.57, 0.52), 0.72, bump=.25, escala=900), playera=mat('o_playera', (0.60, 0.21, 0.09), 0.92, sheen=.15, bump=.5),
                chamarra=mat('o_chamarra', (0.075, 0.072, 0.070), 0.95, sheen=.15, bump=.6), pantalon=mat('o_pantalon', (0.020, 0.020, 0.024), 0.95, sheen=.1, bump=.5),
                zapato=mat('o_zapato', (0.03, 0.03, 0.032), 0.8, bump=.3), suela=mat('o_suela', (0.30, 0.29, 0.27), 0.8),
                pelo=mat('o_pelo', (0.008, 0.007, 0.007), 0.8, sheen=.05, bump=.6, escala=500), ojo=mat('o_ojo', (0.90, 0.89, 0.86), 0.25, emit=(1, 1, 1), strength=0.10),
                iris=mat('o_iris', (0.008, 0.007, 0.006), 0.12), labio=mat('o_labio', (0.22, 0.14, 0.12), 0.7), boca=mat('o_boca', (0.02, 0.008, 0.008), 0.6),
                audifono=mat('o_audifono', (0.028, 0.028, 0.030), 0.45, bump=.2))

def pelo_owen(p):
    c = p.c
    def cap(bm):
        vs = elipsoide(bm, (0, -.002, 1.63), (.0865, .1005, .124), 40, 28)
        bmesh.ops.delete(bm, geom=[v for v in vs if (v.co.z < 1.676 and v.co.y < .012) or v.co.z < 1.60], context='VERTS')
        for dx in (-.030, 0, .030):  # mechón de tres puntas
            capsula(bm, (dx, -.056, 1.728), (dx * 1.35, -.082, 1.752), .016, .005, 10)
    p.parte('cabeza', c['pelo'], cap)
    def aud(bm):
        for sx in (1, -1):
            bmesh.ops.create_cone(bm, cap_ends=True, segments=28, radius1=.043, radius2=.040, depth=.034, matrix=Matrix.Translation((sx * .100, .006, 1.622)) @ Matrix.Rotation(sx * math.pi / 2, 4, 'Y'))
            bmesh.ops.create_cone(bm, cap_ends=True, segments=28, radius1=.046, radius2=.046, depth=.012, matrix=Matrix.Translation((sx * .086, .006, 1.622)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
        n = 16
        for k in range(n):
            a0, a1 = math.pi * k / n, math.pi * (k + 1) / n
            capsula(bm, (.105 * math.cos(a0), .006, 1.63 + .135 * math.sin(a0)), (.105 * math.cos(a1), .006, 1.63 + .135 * math.sin(a1)), .009, .009, 8)
    p.parte('cabeza', c['audifono'], aud)

def owen():
    c = materiales_owen()
    return Personaje('Owen', c, pelo=pelo_owen)

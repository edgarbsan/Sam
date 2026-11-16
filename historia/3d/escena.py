# Autor: BS
# Fase 1: prueba técnica. Piso de arriba del autobús en bloques, a escala real (metros),
# con dos maniquíes con esqueleto sentados en sus asientos. Un solo mundo; cada toma es una cámara.
# Uso: python3 escena.py --cams A,B,C --res 1280x720 --samples 48 --out carpeta
import bpy, bmesh, math, sys, time, os, argparse
from mathutils import Vector, Matrix

ap = argparse.ArgumentParser()
ap.add_argument('--cams', default='A,B,C'); ap.add_argument('--res', default='1280x720')
ap.add_argument('--samples', type=int, default=48); ap.add_argument('--out', default='.')
ap.add_argument('--tag', default=''); ap.add_argument('--motor', default='CYCLES'); ap.add_argument('--denoise', type=int, default=1)
args = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module='cycles')
S = bpy.context.scene
COL = S.collection

# ---------- utilidades ----------
def mat(name, color, rough=0.8, emit=None, strength=0.0, trans=0.0, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = strength
    if trans: b.inputs['Transmission Weight'].default_value = trans
    return m

def finish(bm, name, material, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if smooth:
        for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); o.data.materials.append(material); COL.objects.link(o); return o

def box(name, mn, mx, material):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector(((v.co.x + .5) * (mx[0] - mn[0]) + mn[0], (v.co.y + .5) * (mx[1] - mn[1]) + mn[1], (v.co.z + .5) * (mx[2] - mn[2]) + mn[2]))
    return finish(bm, name, material, smooth=False)

def capsule(bm, p0, p1, r0, r1, seg=20):
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0
    rot = d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=seg, radius1=r0, radius2=r1, depth=d.length, matrix=Matrix.Translation((p0 + p1) / 2) @ rot)
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=10, radius=r0, matrix=Matrix.Translation(p0) @ rot)
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=10, radius=r1, matrix=Matrix.Translation(p1) @ rot)

def ellipsoid(bm, c, r, seg=24):
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=14, radius=1.0, matrix=Matrix.Translation(c) @ Matrix.Diagonal((r[0], r[1], r[2], 1)))

def tube(name, p0, p1, r, material):
    bm = bmesh.new(); capsule(bm, p0, p1, r, r, 12); return finish(bm, name, material)

# ---------- materiales ----------
M = dict(
    bus=mat('bus', (0.20, 0.20, 0.21), 0.85), piso=mat('piso', (0.07, 0.07, 0.08), 0.6),
    techo=mat('techo', (0.42, 0.41, 0.39), 0.8), asiento=mat('asiento', (0.07, 0.09, 0.14), 0.9),
    tubo=mat('tubo', (0.75, 0.55, 0.05), 0.35, metal=0.6), luz=mat('luz', (1, 1, 1), 0.5, emit=(1.0, 0.95, 0.82), strength=2.5),
    vidrio=mat('vidrio', (0.8, 0.85, 0.9), 0.03, trans=1.0), negro=mat('negro', (0.01, 0.01, 0.01), 0.9),
    pista=mat('pista', (1, 1, 1), 0.5, emit=(1.0, 0.8, 0.5), strength=400.0),
    suelo=mat('suelo', (0.02, 0.025, 0.02), 0.5),
)

# ---------- el autobús (x: ancho, y: largo hacia atrás, z: alto) ----------
ANCHO, LARGO, ALTO = 1.2, 9.0, 1.78
box('piso', (-ANCHO, 0, -0.05), (ANCHO, LARGO, 0), M['piso'])
box('techo', (-ANCHO, 0, ALTO), (ANCHO, LARGO, ALTO + 0.05), M['techo'])
box('fondo', (-ANCHO, LARGO, 0), (ANCHO, LARGO + 0.05, ALTO), M['bus'])
box('frente_bajo', (-ANCHO, -0.05, 0), (ANCHO, 0, 0.75), M['bus'])
box('frente_alto', (-ANCHO, -0.05, 1.5), (ANCHO, 0, ALTO), M['bus'])
for sd in (-1, 1):
    x0, x1 = (sd * ANCHO, sd * (ANCHO + 0.05)) if sd > 0 else (sd * (ANCHO + 0.05), sd * ANCHO)
    box(f'pared_baja{sd}', (x0, 0, 0), (x1, LARGO, 0.78), M['bus'])
    box(f'pared_alta{sd}', (x0, 0, 1.48), (x1, LARGO, ALTO), M['bus'])
    y = 0.0
    while y <= LARGO:  # montantes entre ventanas
        box(f'montante{sd}_{y:.1f}', (x0, y - 0.04, 0.78), (x1, y + 0.04, 1.48), M['bus']); y += 1.5
    gx = sd * (ANCHO + 0.02)
    box(f'vidrio{sd}', (gx - 0.004, 0, 0.78), (gx + 0.004, LARGO, 1.48), M['vidrio'])
# luces del techo: dos filas de tubos
for x in (-0.42, 0.42):
    for k in range(4):
        y0 = 0.9 + k * 2.1; box(f'tubo_luz{x}_{k}', (x - 0.035, y0, ALTO - 0.03), (x + 0.035, y0 + 1.1, ALTO - 0.005), M['luz'])
        ld = bpy.data.lights.new(f'luz{x}_{k}', 'AREA'); ld.shape = 'RECTANGLE'; ld.size = 0.07; ld.size_y = 1.1; ld.energy = 9.0; ld.color = (1.0, 0.95, 0.82)
        lo = bpy.data.objects.new(f'luz{x}_{k}', ld); COL.objects.link(lo); lo.location = (x, y0 + 0.55, ALTO - 0.035)
# asientos: filas de 2 + 2, mirando al frente (hacia -y)
FILAS = [1.3 + 0.8 * k for k in range(7)]
XS = {-1: (-0.93, -0.47), 1: (0.47, 0.93)}
def asiento_xy(fila, lado, pos):  # fila 1..7; lado -1 izquierda, 1 derecha; pos 0 ventana, 1 pasillo
    xs = XS[lado]; return (xs[0] if (lado < 0) == (pos == 0) else xs[1]), FILAS[fila - 1]
for i, y in enumerate(FILAS):
    for sd in (-1, 1):
        if sd > 0 and y > 6.6: continue  # hueco de la escalera, atrás a la derecha
        xa, xb = (-1.16, -0.24) if sd < 0 else (0.24, 1.16)
        box(f'cojin{i}{sd}', (xa, y - 0.22, 0.38), (xb, y + 0.22, 0.45), M['asiento'])
        box(f'respaldo{i}{sd}', (xa, y + 0.25, 0.40), (xb, y + 0.31, 1.06), M['asiento'])
        box(f'base{i}{sd}', (xa + 0.1, y - 0.1, 0), (xb - 0.1, y + 0.2, 0.38), M['negro'])
        tube(f'agarre{i}{sd}', (xa + 0.03, y + 0.28, 1.09), (xb - 0.03, y + 0.28, 1.09), 0.016, M['tubo'])
        if i % 2 == 0:
            xp = xb - 0.02 if sd < 0 else xa + 0.02
            tube(f'poste{i}{sd}', (xp, y + 0.28, 1.06), (xp, y + 0.28, ALTO), 0.017, M['tubo'])
for x in (-0.24, 0.24): tube(f'pasamanos{x}', (x, 1.5, 1.68), (x, LARGO - 0.6, 1.68), 0.015, M['tubo'])
# escalera: hueco atrás a la derecha con barandal
box('hueco', (0.26, 7.1, -0.04), (1.16, 8.7, 0.002), M['negro'])
for (a, b) in (((0.26, 7.1), (0.26, 8.7)), ((0.26, 7.1), (1.16, 7.1))):
    tube('baranda', (a[0], a[1], 0.95), (b[0], b[1], 0.95), 0.017, M['tubo'])
    for p in (a, b): tube('baranda_p', (p[0], p[1], 0), (p[0], p[1], 0.95), 0.017, M['tubo'])
# afuera: suelo lejano y luces de la pista del lado izquierdo
box('suelo', (-300, -200, -2.62), (300, 300, -2.6), M['suelo'])
bm = bmesh.new()
for k in range(40): ellipsoid(bm, (-70 - (k % 3) * 25, -60 + k * 7.0, -2.3), (0.35, 0.35, 0.35), 8)
finish(bm, 'luces_pista', M['pista'])

# ---------- maniquí con esqueleto ----------
HUESOS = [  # nombre, cabeza, cola, padre, eje de referencia para el giro
    ('cadera', (0, 0, 0.93), (0, 0, 1.05), None, (0, -1, 0)), ('columna', (0, 0, 1.05), (0, 0, 1.22), 'cadera', (0, -1, 0)),
    ('pecho', (0, 0, 1.22), (0, 0, 1.45), 'columna', (0, -1, 0)), ('cuello', (0, 0, 1.45), (0, 0, 1.53), 'pecho', (0, -1, 0)),
    ('cabeza', (0, 0, 1.53), (0, 0, 1.76), 'cuello', (0, -1, 0))]
for s, sx in (('I', 1), ('D', -1)):  # I: izquierda del personaje (+x); D: derecha (-x)
    HUESOS += [(f'brazo.{s}', (sx * .19, 0, 1.41), (sx * .19, 0, 1.12), 'pecho', (0, 1, 0)),
               (f'antebrazo.{s}', (sx * .19, 0, 1.12), (sx * .19, 0, .86), f'brazo.{s}', (0, 1, 0)),
               (f'mano.{s}', (sx * .19, 0, .86), (sx * .19, 0, .68), f'antebrazo.{s}', (0, 1, 0)),
               (f'muslo.{s}', (sx * .09, 0, .93), (sx * .09, 0, .49), 'cadera', (0, 1, 0)),
               (f'pierna.{s}', (sx * .09, 0, .49), (sx * .09, 0, .08), f'muslo.{s}', (0, 1, 0)),
               (f'pie.{s}', (sx * .09, 0, .08), (sx * .09, -.20, .02), f'pierna.{s}', (0, 0, -1))]

def persona(nombre, col, extra=None):
    ad = bpy.data.armatures.new(nombre + '_esq'); arm = bpy.data.objects.new(nombre, ad); COL.objects.link(arm)
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
    for n, h, t, p, rv in HUESOS:
        b = ad.edit_bones.new(n); b.head = h; b.tail = t; b.align_roll(Vector(rv))
        if p: b.parent = ad.edit_bones[p]
    bpy.ops.object.mode_set(mode='OBJECT')
    def pega(o, hueso):
        bo = ad.bones[hueso]
        o.parent = arm; o.parent_type = 'BONE'; o.parent_bone = hueso
        o.matrix_parent_inverse = (arm.matrix_world @ bo.matrix_local @ Matrix.Translation((0, bo.length, 0))).inverted()
    def parte(hueso, material, fn, smooth=True):
        bm = bmesh.new(); fn(bm); o = finish(bm, f'{nombre}_{hueso}', material, smooth); pega(o, hueso); return o
    piel, arriba, abajo, zap = col['piel'], col['arriba'], col['abajo'], col['zapato']
    parte('cadera', abajo, lambda bm: ellipsoid(bm, (0, 0, .97), (.165, .115, .11)))
    parte('columna', col.get('playera', arriba), lambda bm: ellipsoid(bm, (0, 0, 1.12), (.145, .10, .12)))
    parte('pecho', col.get('playera', arriba), lambda bm: ellipsoid(bm, (0, 0, 1.31), (.172, .112, .16)))
    parte('pecho', arriba, lambda bm: [ellipsoid(bm, (sx * .19, 0, 1.41), (.06, .06, .06)) for sx in (1, -1)])
    parte('cuello', piel, lambda bm: capsule(bm, (0, 0, 1.44), (0, 0, 1.55), .048, .046))
    parte('cabeza', piel, lambda bm: (ellipsoid(bm, (0, -.008, 1.645), (.082, .098, .118)), ellipsoid(bm, (0, -.106, 1.63), (.012, .018, .022), 10)))
    parte('cabeza', col['ojo'], lambda bm: [ellipsoid(bm, (sx * .032, -.089, 1.667), (.013, .010, .013), 10) for sx in (1, -1)])
    for s, sx in (('I', 1), ('D', -1)):
        parte(f'brazo.{s}', arriba, lambda bm: capsule(bm, (sx * .19, 0, 1.41), (sx * .19, 0, 1.12), .05, .042))
        parte(f'antebrazo.{s}', arriba, lambda bm: capsule(bm, (sx * .19, 0, 1.12), (sx * .19, 0, .87), .041, .031))
        parte(f'mano.{s}', piel, lambda bm: ellipsoid(bm, (sx * .19, -.008, .775), (.022, .044, .085)))
        parte(f'muslo.{s}', abajo, lambda bm: capsule(bm, (sx * .09, 0, .93), (sx * .09, 0, .49), .078, .056))
        parte(f'pierna.{s}', abajo, lambda bm: capsule(bm, (sx * .09, 0, .49), (sx * .09, 0, .09), .053, .038))
        parte(f'pie.{s}', zap, lambda bm: ellipsoid(bm, (sx * .09, -.07, .042), (.046, .125, .042)))
    if extra: extra(parte)
    return arm

def sentar(arm, x, y, giro_cabeza=0.0, incl=0.0):
    arm.location = (x, y + 0.08, -0.40)
    R = math.radians
    pose = {'columna': (R(-6 + incl), 0, 0), 'cabeza': (R(4), R(giro_cabeza), 0)}
    for s in ('I', 'D'):
        pose[f'muslo.{s}'] = (R(-90), 0, 0); pose[f'pierna.{s}'] = (R(90), 0, 0)
        pose[f'brazo.{s}'] = (R(-22), 0, 0); pose[f'antebrazo.{s}'] = (R(-62), 0, 0); pose[f'mano.{s}'] = (R(-8), 0, 0)
    for n, e in pose.items():
        pb = arm.pose.bones[n]; pb.rotation_mode = 'XYZ'; pb.rotation_euler = e

def pelo_owen(parte):
    def cap(bm):
        ellipsoid(bm, (0, .004, 1.66), (.089, .105, .123))
        borrar = [v for v in bm.verts if (v.co.z < 1.70 and v.co.y < 0.01) or v.co.z < 1.60]
        bmesh.ops.delete(bm, geom=borrar, context='VERTS')
        for dx in (-.03, 0, .03): capsule(bm, (dx, -.03, 1.765), (dx * 1.3, -.05, 1.80), .012, .003, 8)
    parte('cabeza', MP['pelo'], cap)
    def aud(bm):
        for sx in (1, -1): bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=.047, radius2=.047, depth=.04, matrix=Matrix.Translation((sx * .098, .005, 1.645)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
        n = 14
        for k in range(n):
            a0, a1 = math.pi * k / n, math.pi * (k + 1) / n
            capsule(bm, (.103 * math.cos(a0), .005, 1.66 + .12 * math.sin(a0)), (.103 * math.cos(a1), .005, 1.66 + .12 * math.sin(a1)), .011, .011, 8)
    parte('cabeza', MP['audifono'], aud)

MP = dict(pelo=mat('pelo', (0.012, 0.011, 0.011), 0.7), audifono=mat('audifono', (0.03, 0.03, 0.03), 0.5),
          piel=mat('piel', (0.62, 0.55, 0.50), 0.75), ojo=mat('ojo', (0.01, 0.01, 0.01), 0.3),
          durazno=mat('durazno', (0.62, 0.22, 0.10), 0.85), gris=mat('gris', (0.045, 0.042, 0.04), 0.9),
          oscuro=mat('oscuro', (0.02, 0.02, 0.022), 0.9), verde=mat('verde', (0.07, 0.085, 0.06), 0.9),
          palida=mat('palida', (0.55, 0.57, 0.52), 0.75), venda=mat('venda', (0.8, 0.78, 0.72), 0.9))
owen = persona('Owen', dict(piel=MP['piel'], arriba=MP['gris'], playera=MP['durazno'], abajo=MP['oscuro'], zapato=MP['oscuro'], ojo=MP['ojo']), pelo_owen)
hombre = persona('Hombre', dict(piel=MP['palida'], arriba=MP['verde'], abajo=MP['oscuro'], zapato=MP['oscuro'], ojo=MP['ojo']),
                 lambda parte: parte('mano.D', MP['venda'], lambda bm: ellipsoid(bm, (-.19, -.008, .79), (.03, .05, .075))))
ox, oy = asiento_xy(3, -1, 0); hx, hy = asiento_xy(4, -1, 0)
sentar(owen, ox, oy, giro_cabeza=-12, incl=2)   # Owen mira hacia su ventana
sentar(hombre, hx, hy, incl=6)
bpy.context.view_layer.update()

# ---------- mundo y cámaras ----------
w = bpy.data.worlds.new('noche'); w.use_nodes = True; S.world = w
w.node_tree.nodes['Background'].inputs[0].default_value = (0.004, 0.006, 0.012, 1)
def camara(name, loc, mira, lente, fstop=None, foco=None):
    cd = bpy.data.cameras.new(name); cd.lens = lente; cd.clip_start = 0.05
    o = bpy.data.objects.new(name, cd); COL.objects.link(o); o.location = loc
    d = Vector(mira) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if fstop: cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop; cd.dof.focus_distance = (Vector(foco) - Vector(loc)).length
    return o
cabO = (ox, oy + 0.08, 1.24); cabH = (hx, hy + 0.08, 1.24)
CAMS = {
    'A': camara('A_general', (0.0, 0.18, 1.56), (-0.3, 4.4, 0.98), 17),
    'B': camara('B_profundidad', (-0.42, oy - 0.62, 1.26), (hx + 0.05, hy, 1.2), 40, fstop=2.0, foco=cabO),
    'C': camara('C_perfil', (0.42, oy - 0.02, 1.24), (ox, oy - 0.10, 1.22), 50, fstop=2.8, foco=cabO),
}

# ---------- render ----------
rx, ry = map(int, args.res.split('x')); S.render.resolution_x = rx; S.render.resolution_y = ry; S.render.resolution_percentage = 100
if args.motor == 'CYCLES':
    S.render.engine = 'CYCLES'; S.cycles.device = 'CPU'; S.cycles.samples = args.samples
    S.cycles.use_adaptive_sampling = True; S.cycles.adaptive_threshold = 0.03; S.cycles.max_bounces = 4
    S.cycles.use_denoising = bool(args.denoise)
    if args.denoise: S.cycles.denoiser = 'OPENIMAGEDENOISE'
else:
    S.render.engine = 'BLENDER_EEVEE'; S.eevee.taa_render_samples = args.samples
    try: S.eevee.use_raytracing = True
    except Exception as e: print('sin trazado en eevee:', e)
S.render.image_settings.file_format = 'PNG'
try: S.view_settings.view_transform = 'Filmic'
except Exception: pass
S.view_settings.exposure = 1.2
os.makedirs(args.out, exist_ok=True)
for k in args.cams.split(','):
    S.camera = CAMS[k]; S.render.filepath = os.path.join(args.out, f'cam{k}{args.tag}.png')
    t0 = time.time(); bpy.ops.render.render(write_still=True)
    print(f'TIEMPO cam {k} {rx}x{ry} {args.samples} muestras {args.motor}: {time.time() - t0:.1f} s', flush=True)

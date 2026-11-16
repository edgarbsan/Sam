# Autor: BS
# Utilidades comunes para construir la escena 3D con Blender desde código.
import bpy, bmesh, math
from mathutils import Vector, Matrix

def reiniciar():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.preferences.addon_enable(module='cycles')

def col(): return bpy.context.scene.collection

def mat(name, color, rough=0.8, emit=None, strength=0.0, trans=0.0, metal=0.0, sheen=0.0, bump=0.0, escala=700.0, motas=0.0, escala_motas=60.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = strength
    if trans: b.inputs['Transmission Weight'].default_value = trans
    if sheen: b.inputs['Sheen Weight'].default_value = sheen; b.inputs['Sheen Roughness'].default_value = 0.6
    if bump:  # grano fino, como fieltro o papel
        tc = nt.nodes.new('ShaderNodeTexCoord'); n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = escala
        n.inputs['Detail'].default_value = 4.0; bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = 0.002
        nt.links.new(tc.outputs['Object'], n.inputs['Vector']); nt.links.new(n.outputs[0], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    if motas:  # variación de tono, como tela teñida a mano
        tc2 = nt.nodes.new('ShaderNodeTexCoord'); n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = escala_motas; n2.inputs['Detail'].default_value = 6.0
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'
        mx.inputs[6].default_value = (*[max(0.0, v * (1 - motas)) for v in color], 1); mx.inputs[7].default_value = (*[min(1.0, v * (1 + motas)) for v in color], 1)
        nt.links.new(tc2.outputs['Object'], n2.inputs['Vector']); nt.links.new(n2.outputs[0], mx.inputs[0]); nt.links.new(mx.outputs[2], b.inputs['Base Color'])
    return m

def cadena(bm, pts, r0, r1=None, seg=8):
    r1 = r0 if r1 is None else r1; n = len(pts) - 1
    for i in range(n): capsula(bm, pts[i], pts[i + 1], r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n, seg)

def anillo(bm, p0, p1, t, radio, grosor, inclin=0.0, n=14, seg=6):
    """Arruga: un aro alrededor de una extremidad, a la fracción t entre p0 y p1."""
    p0, p1 = Vector(p0), Vector(p1); eje = (p1 - p0).normalized(); c = p0.lerp(p1, t)
    u = eje.orthogonal().normalized(); v = eje.cross(u)
    pts = [c + radio * (math.cos(a) * u + math.sin(a) * v) + eje * (inclin * math.cos(a)) for a in [2 * math.pi * k / n for k in range(n + 1)]]
    cadena(bm, pts, grosor, grosor, seg)

def terminar(bm, name, material, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if smooth:
        for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); o.data.materials.append(material); col().objects.link(o); return o

def caja(name, mn, mx, material):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector(((v.co.x + .5) * (mx[0] - mn[0]) + mn[0], (v.co.y + .5) * (mx[1] - mn[1]) + mn[1], (v.co.z + .5) * (mx[2] - mn[2]) + mn[2]))
    return terminar(bm, name, material, smooth=False)

def capsula(bm, p0, p1, r0, r1, seg=20):
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0
    rot = d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=seg, radius1=r0, radius2=r1, depth=d.length, matrix=Matrix.Translation((p0 + p1) / 2) @ rot)
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=10, radius=r0, matrix=Matrix.Translation(p0) @ rot)
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=10, radius=r1, matrix=Matrix.Translation(p1) @ rot)

def elipsoide(bm, c, r, seg=24, vseg=14):
    return bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=vseg, radius=1.0, matrix=Matrix.Translation(c) @ Matrix.Diagonal((r[0], r[1], r[2], 1)))['verts']

def tubo(name, p0, p1, r, material):
    bm = bmesh.new(); capsula(bm, p0, p1, r, r, 12); return terminar(bm, name, material)

def luz_area(name, loc, mira, ancho, alto, energia, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = ancho; ld.size_y = alto; ld.energy = energia; ld.color = color
    o = bpy.data.objects.new(name, ld); col().objects.link(o); o.location = loc
    o.rotation_euler = (Vector(mira) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return o

def camara(name, loc, mira, lente, fstop=None, foco=None):
    cd = bpy.data.cameras.new(name); cd.lens = lente; cd.clip_start = 0.05
    o = bpy.data.objects.new(name, cd); col().objects.link(o); o.location = loc
    o.rotation_euler = (Vector(mira) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    if fstop: cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop; cd.dof.focus_distance = (Vector(foco) - Vector(loc)).length
    return o

def preparar_render(rx, ry, muestras, exposicion=0.0):
    S = bpy.context.scene
    S.render.engine = 'CYCLES'; S.cycles.device = 'CPU'; S.cycles.samples = muestras
    S.cycles.use_adaptive_sampling = True; S.cycles.adaptive_threshold = 0.03; S.cycles.max_bounces = 4
    S.cycles.use_denoising = True; S.cycles.denoiser = 'OPENIMAGEDENOISE'
    S.render.resolution_x = rx; S.render.resolution_y = ry; S.render.resolution_percentage = 100
    S.render.image_settings.file_format = 'JPEG'; S.render.image_settings.quality = 92
    try: S.view_settings.view_transform = 'Filmic'
    except Exception: pass
    S.view_settings.exposure = exposicion

# Autor: BS
# El autobús de dos pisos, construido una sola vez. Todas las tomas son cámaras dentro de este mundo.
# Ejes: x ancho (x < 0: lado de las ventanas a la pista, el de Owen; x > 0: lado de la escalera),
# y largo hacia atrás (0 = frente del piso de arriba), z alto (0 = piso de arriba; -2 = piso de abajo).
import bpy, bmesh, math, random
from mathutils import Vector, Matrix
import base3d as B

ANCHO, LARGO, ALTO = 1.2, 9.0, 1.82
ABAJO = -2.0                         # piso de abajo
CALLE = -2.36                        # el asfalto
FILAS = [1.3 + 0.8 * k for k in range(7)]
CX = {('V', 0): -.935, ('V', 1): -.485, ('E', 1): .485, ('E', 0): .935}   # V: lado de la pista; E: lado de la escalera; 0 ventana, 1 pasillo
HUECO = (.28, ANCHO, 6.8, 8.4)       # hueco de la escalera: x0, x1, y0, y1
PELDANOS = 9

def asiento(fila, lado, pos):
    """Punto de referencia del asiento: centro, cara delantera del respaldo, arriba del cojín."""
    return Vector((CX[(lado, pos)], FILAS[fila - 1] + .25, .40))

def _mats():
    return dict(
        bus=B.mat('bus', (0.16, 0.16, 0.17), 0.85, bump=.3, escala=300), panel=B.mat('panel', (0.30, 0.30, 0.29), 0.7),
        piso=B.mat('piso', (0.05, 0.05, 0.055), 0.55, bump=.6, escala=180), techo=B.mat('techo', (0.40, 0.39, 0.37), 0.8),
        asiento=B.mat('asiento', (0.05, 0.07, 0.13), 0.92, sheen=.3, bump=.8, escala=500, motas=.35, escala_motas=90),
        tubo=B.mat('tubo', (0.75, 0.55, 0.05), 0.35, metal=0.6), boton=B.mat('boton', (0.5, 0.02, 0.02), 0.4),
        luz=B.mat('luz', (1, 1, 1), 0.5, emit=(1.0, 0.95, 0.82), strength=2.5),
        vidrio=B.mat('vidrio', (0.8, 0.85, 0.9), 0.03, trans=1.0), gota=B.mat('gota', (0.9, 0.92, 0.95), 0.02, trans=1.0),
        negro=B.mat('negro', (0.012, 0.012, 0.012), 0.9), hule=B.mat('hule', (0.03, 0.03, 0.03), 0.7, bump=.5, escala=400),
        amarillo=B.mat('amarillo', (0.75, 0.55, 0.02), 0.6), espejo=B.mat('espejo', (0.9, 0.9, 0.9), 0.04, metal=1.0),
        pantalla=B.mat('pantalla', (0.0, 0.0, 0.0), 0.3), texto=B.mat('texto', (1, 1, 1), 0.5, emit=(0.75, 0.85, 1.0), strength=3.0),
        asfalto=B.mat('asfalto', (0.012, 0.012, 0.013), 0.12), campo=B.mat('campo', (0.010, 0.013, 0.009), 0.9),
        pista=B.mat('pista', (1, 1, 1), 0.5, emit=(1.0, 0.8, 0.5), strength=400.0),
        farol=B.mat('farol', (1, 1, 1), 0.5, emit=(1.0, 0.55, 0.18), strength=60.0),
        calavera=B.mat('calavera', (1, 1, 1), 0.5, emit=(1.0, 0.04, 0.02), strength=40.0),
        tela=B.mat('tela_carriola', (0.03, 0.035, 0.04), 0.9, sheen=.3), gris=B.mat('gris_carriola', (0.25, 0.25, 0.26), 0.4, metal=.6),
    )

def construir():
    M = _mats(); bus = {}
    caja, tubo = B.caja, B.tubo
    x0, x1, y0, y1 = HUECO
    # ---- pisos, techo y paredes ----
    caja('piso_a', (-ANCHO, 0, -.06), (ANCHO, y0, 0), M['piso'])
    caja('piso_b', (-ANCHO, y0, -.06), (x0, LARGO, 0), M['piso'])
    caja('piso_c', (x0, y1, -.06), (ANCHO, LARGO, 0), M['piso'])
    bus['techo'] = [caja('techo', (-ANCHO, 0, ALTO), (ANCHO, LARGO, ALTO + .05), M['techo'])]
    caja('piso_abajo', (-ANCHO, -1, ABAJO - .05), (ANCHO, LARGO, ABAJO), M['piso'])
    caja('fondo', (-ANCHO, LARGO, ABAJO), (ANCHO, LARGO + .05, ALTO), M['bus'])
    caja('frente_bajo', (-ANCHO, -.05, 0), (ANCHO, 0, .75), M['bus'])
    caja('frente_alto', (-ANCHO, -.05, 1.5), (ANCHO, 0, ALTO), M['bus'])
    caja('tablero', (-ANCHO, 0, .70), (ANCHO, .28, .76), M['negro'])
    caja('parabrisas', (-ANCHO, -.035, .75), (ANCHO, -.025, 1.5), M['vidrio'])
    for sd in (-1, 1):
        xa, xb = sorted((sd * ANCHO, sd * (ANCHO + .05)))
        caja(f'pared_baja{sd}', (xa, 0, ABAJO), (xb, LARGO, .78), M['bus'])
        caja(f'pared_alta{sd}', (xa, 0, 1.48), (xb, LARGO, ALTO), M['bus'])
        y = 0.0
        while y <= LARGO + .01:
            caja(f'montante{sd}_{y:.1f}', (xa, y - .045, .78), (xb, y + .045, 1.48), M['bus']); y += 1.5
        gx = sd * (ANCHO + .02)
        caja(f'vidrio{sd}', (gx - .004, 0, .78), (gx + .004, LARGO, 1.48), M['vidrio'])
        # gotas de lluvia por fuera del vidrio
        rnd = random.Random(11 + sd); bm = bmesh.new()
        for _ in range(900):
            r = rnd.uniform(.0018, .0048); yy = rnd.uniform(.05, LARGO - .05); zz = rnd.uniform(.80, 1.46)
            B.elipsoide(bm, (gx + sd * (.0045 + r * .3), yy, zz), (r * .35, r, r * 1.25), 8, 5)
            if rnd.random() < .12:  # escurrimiento
                B.capsula(bm, (gx + sd * .005, yy, zz), (gx + sd * .005, yy + rnd.uniform(-.004, .004), zz - rnd.uniform(.02, .06)), r * .45, r * .3, 6)
        B.terminar(bm, f'gotas{sd}', M['gota'])
    # ---- luces del techo: dos filas de tubos ----
    bus['tubos'] = []
    for x in (-.42, .42):
        for k in range(4):
            ya = .9 + k * 2.1
            m = caja(f'tubo_luz{x}_{k}', (x - .035, ya, ALTO - .03), (x + .035, ya + 1.1, ALTO - .005), M['luz'].copy())
            ld = bpy.data.lights.new(f'luz{x}_{k}', 'AREA'); ld.shape = 'RECTANGLE'; ld.size = .07; ld.size_y = 1.1; ld.energy = 9.0; ld.color = (1.0, .95, .82)
            lo = bpy.data.objects.new(f'luz{x}_{k}', ld); B.col().objects.link(lo); lo.location = (x, ya + .55, ALTO - .035)
            bus['tubos'].append((k, m, lo))
    # ---- asientos ----
    for i, yr in enumerate(FILAS):
        for lado, (xa, xb) in (('V', (-1.16, -.26)), ('E', (.26, 1.16))):
            yb = yr + .25
            bm = bmesh.new()
            for sx0, sx1 in ((xa, (xa + xb) / 2 - .005), ((xa + xb) / 2 + .005, xb)):
                B.capsula(bm, (sx0 + .05, yb - .23, .355), (sx1 - .05, yb - .23, .355), .045, .045, 14)  # cojín: borde redondo
                for v in bmesh.ops.create_cube(bm, size=1.0)['verts']:
                    v.co = Vector(((v.co.x + .5) * (sx1 - sx0 - .02) + sx0 + .01, (v.co.y + .5) * .42 + yb - .44, (v.co.z + .5) * .09 + .31))
                for v in bmesh.ops.create_cube(bm, size=1.0)['verts']:  # respaldo un poco inclinado
                    t = v.co.z + .5
                    v.co = Vector(((v.co.x + .5) * (sx1 - sx0 - .02) + sx0 + .01, (v.co.y + .5) * .07 + yb + .045 * t, t * .62 + .40))
                B.capsula(bm, (sx0 + .05, yb + .08, 1.02), (sx1 - .05, yb + .08, 1.02), .04, .04, 14)  # cabecera
            B.terminar(bm, f'asientos{i}{lado}', M['asiento'])
            caja(f'base{i}{lado}', (xa + .1, yb - .35, 0), (xb - .1, yb - .05, .31), M['negro'])
            tubo(f'agarre{i}{lado}', (xa + .04, yb + .13, 1.06), (xb - .04, yb + .13, 1.06), .016, M['tubo'])
            if i % 2 == 0:
                xp = xb - .02 if lado == 'V' else xa + .02
                tubo(f'poste{i}{lado}', (xp, yb + .13, 1.06), (xp, yb + .13, ALTO), .017, M['tubo'])
                B.terminar(_cil(xp, yb + .13, 1.32, .026, .05), f'boton{i}{lado}', M['boton'])
    for x in (-.26, .26): tubo(f'pasamanos{x}', (x, 1.5, 1.70), (x, LARGO - .6, 1.70), .015, M['tubo'])
    # ---- escalera: baja hacia atrás, del piso de arriba al de abajo ----
    sube, paso = -ABAJO / PELDANOS, (y1 - y0) / PELDANOS
    for i in range(1, PELDANOS + 1):
        z = -sube * i; ya = y0 + paso * (i - 1)
        caja(f'peldano{i}', (x0, ya, z - .05), (x1, ya + paso + .01, z), M['hule'])
        caja(f'contrahuella{i}', (x0, ya - .005, z), (x1, ya + .01, z + sube - .05), M['bus'])
        caja(f'nariz{i}', (x0 + .01, ya, z - .002), (x1 - .01, ya + .035, z + .004), M['amarillo'])
    caja('nariz0', (x0 + .01, y0 - .035, -.002), (x1 - .01, y0, .004), M['amarillo'])
    bus['m_escalera'] = B.mat('luz_escalera', (1, 1, 1), 0.5, emit=(1.0, .9, .7), strength=6.0)
    for i in range(1, PELDANOS + 1):  # lucecitas de cada peldaño, en la pared de la escalera
        z = -sube * i; ya = y0 + paso * (i - .5)
        caja(f'luz_peldano{i}', (x1 - .012, ya - .03, z + .06), (x1 - .004, ya + .03, z + .085), bus['m_escalera'])
    caja('muro_escalera', (x0 - .02, y0, ABAJO), (x0, y1, -.06), M['bus'])
    bus['barandal'] = []
    for a, b in (((x0, y0), (x0, y1)), ((x0, y1), (x1, y1))):
        bus['barandal'].append(tubo('barandal', (a[0], a[1], .95), (b[0], b[1], .95), .018, M['tubo']))
        for p in (a, b): tubo('barandal_p', (p[0], p[1], 0), (p[0], p[1], .95), .018, M['tubo'])
    tubo('barandal_p', (x0, (y0 + y1) / 2, 0), (x0, (y0 + y1) / 2, .95), .018, M['tubo'])
    bus['pasamanos_escalera'] = tubo('pasamanos_escalera', (x1 - .05, y0 - .1, .95), (x1 - .05, y1, ABAJO + .95), .02, M['tubo'])
    tubo('pasamanos_escalera_in', (x0 + .03, y0 + .1, .0), (x0 + .03, y1, ABAJO + .95), .02, M['tubo'])
    # espejo convexo arriba de la escalera, en la pared del fondo, mirando hacia la escalera y el frente
    bm = bmesh.new(); vs = B.elipsoide(bm, (0, 0, 0), (.17, .05, .17), 32, 16)
    bmesh.ops.delete(bm, geom=[v for v in vs if v.co.y > 0], context='VERTS')
    esp = B.terminar(bm, 'espejo', M['espejo']); esp.location = (.74, LARGO - .06, 1.38)
    esp.rotation_euler = Vector((-.18, -1, -.55)).to_track_quat('-Y', 'Z').to_euler()
    bm = bmesh.new(); B.cadena(bm, [(.172 * math.cos(a), .0, .172 * math.sin(a)) for a in [2 * math.pi * k / 40 for k in range(41)]], .012, .012, 8)
    aro = B.terminar(bm, 'aro_espejo', M['negro']); aro.parent = esp
    tubo('brazo_espejo', (.74, LARGO, 1.50), (.74, LARGO - .06, 1.42), .012, M['negro'])
    # ---- carriola plegada, recargada en el barandal ----
    _carriola(M, Vector((x0 - .13, 7.55, 0)))
    # ---- pantalla del frente ----
    caja('pantalla', (-.36, .0, 1.56), (.36, .04, 1.73), M['pantalla'])
    bus['texto'] = _texto('Flughafen BER  ·  Terminal 1-2', M['texto'], (0, .045, 1.635), .045)
    # ---- piso de abajo: solo lo que se ve por la escalera ----
    bus['luces_abajo'] = []
    for k, ya in enumerate((3.6, 6.0)):
        caja(f'tubo_abajo{k}', (-.47, ya - .5, -.10), (-.4, ya + .5, -.07), M['luz'])
        ld = bpy.data.lights.new(f'luz_abajo{k}', 'AREA'); ld.shape = 'RECTANGLE'; ld.size = .07; ld.size_y = 1.0; ld.energy = 6.0; ld.color = (1.0, .95, .82)
        lo = bpy.data.objects.new(f'luz_abajo{k}', ld); B.col().objects.link(lo); lo.location = (-.435, ya, -.11); bus['luces_abajo'].append(lo)
    ld = bpy.data.lights.new('roja_abajo', 'AREA'); ld.size = .6; ld.energy = 0.0; ld.color = (1.0, .06, .03)
    lo = bpy.data.objects.new('roja_abajo', ld); B.col().objects.link(lo); lo.location = (.74, 8.2, ABAJO + .25); bus['roja'] = lo
    # ---- afuera: carretera de acceso al aeropuerto, de noche, con lluvia ----
    caja('asfalto', (-4.5, -400, CALLE - .02), (4.5, 400, CALLE), M['asfalto'])
    caja('campo', (-400, -400, CALLE - .05), (400, 400, CALLE - .03), M['campo'])
    bm = bmesh.new()
    for k in range(40): B.elipsoide(bm, (-70 - (k % 3) * 25, -60 + k * 7.0, CALLE + .3), (.35, .35, .35), 8, 6)
    B.terminar(bm, 'luces_pista', M['pista'])
    bm = bmesh.new(); bmp = bmesh.new()
    for sd in (-1, 1):
        for k in range(-6, 8):
            yy = k * 34 + (17 if sd > 0 else 0); px = sd * 6.5
            B.capsula(bmp, (px, yy, CALLE), (px, yy, CALLE + 7.5), .07, .06, 8); B.capsula(bmp, (px, yy, CALLE + 7.5), (px - sd * 1.2, yy, CALLE + 7.7), .05, .05, 8)
            B.elipsoide(bm, (px - sd * 1.25, yy, CALLE + 7.6), (.22, .12, .06), 12, 6)
    B.terminar(bm, 'faroles', M['farol']); B.terminar(bmp, 'postes', M['negro'])
    bm = bmesh.new()
    for yy, xx in ((-38, 1.6), (-75, -1.7), (-120, 1.5)):
        for dx in (-.65, .65): B.elipsoide(bm, (xx + dx, yy, CALLE + .9), (.12, .05, .07), 10, 6)
    B.terminar(bm, 'calaveras', M['calavera'])
    ld = bpy.data.lights.new('azul_fuera', 'AREA'); ld.size = 4; ld.energy = 0.0; ld.color = (.15, .3, 1.0)
    lo = bpy.data.objects.new('azul_fuera', ld); B.col().objects.link(lo); lo.location = (-5, 3.0, 1.0)
    lo.rotation_euler = (Vector((0, 3.5, .8)) - lo.location).to_track_quat('-Z', 'Y').to_euler(); lo.visible_camera = False; lo.visible_glossy = False; lo.visible_transmission = False; bus['azul'] = lo
    w = bpy.data.worlds.new('noche'); w.use_nodes = True; bpy.context.scene.world = w
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.004, 0.006, 0.012, 1)
    bus['M'] = M
    return bus

def _cil(x, y, z, r, h):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=r, radius2=r, depth=h, matrix=Matrix.Translation((x, y, z))); return bm

def _texto(cadena, material, loc, tam):
    cu = bpy.data.curves.new('texto', 'FONT'); cu.body = cadena; cu.size = tam; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    o = bpy.data.objects.new('texto', cu); o.data.materials.append(material); B.col().objects.link(o)
    o.location = loc; o.rotation_euler = (math.pi / 2, 0, math.pi); return o

def _carriola(M, base):
    """Carriola plegada de pie: dos marcos, ruedas, tela y manubrio. base: punto en el piso."""
    bm, bt, br = bmesh.new(), bmesh.new(), bmesh.new()
    for dx in (-.11, .11):
        B.capsula(bm, base + Vector((dx, .10, .08)), base + Vector((dx, -.02, 1.02)), .011, .011, 8)   # marco trasero
        B.capsula(bm, base + Vector((dx, -.08, .08)), base + Vector((dx, .01, .80)), .011, .011, 8)    # marco delantero
        for dy in (.10, -.08):
            bmesh.ops.create_cone(br, cap_ends=True, segments=16, radius1=.075, radius2=.075, depth=.03, matrix=Matrix.Translation(base + Vector((dx, dy, .075))) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
    B.capsula(bm, base + Vector((-.13, -.02, 1.02)), base + Vector((.13, -.02, 1.02)), .016, .016, 10)  # manubrio
    B.elipsoide(bt, base + Vector((0, .02, .55)), (.10, .055, .30), 16, 10)                               # tela plegada
    B.terminar(bm, 'carriola_marco', M['gris']); B.terminar(br, 'carriola_ruedas', M['negro']); B.terminar(bt, 'carriola_tela', M['tela'])

def luz(bus, estado):
    """estado: 'calma' (tubos encendidos, parejos) o 'panico' (atrás apagado, rojo en la escalera, azul afuera)."""
    for k, m, lo in bus['tubos']:
        nodo = m.data.materials[0].node_tree.nodes['Principled BSDF']
        if estado == 'calma':
            lo.data.energy = 4.0; lo.data.color = (1.0, .95, .84); nodo.inputs['Emission Strength'].default_value = 2.0
        else:
            on = k < 2
            lo.data.energy = 3.0 if on else 0.0; lo.data.color = (.84, .92, 1.0); nodo.inputs['Emission Strength'].default_value = 1.4 if on else 0.0
    for lo in bus['luces_abajo']: lo.data.energy = 6.0 if estado == 'calma' else 0.0
    me = bus['m_escalera'].node_tree.nodes['Principled BSDF']
    me.inputs['Emission Color'].default_value = (1.0, .9, .7, 1) if estado == 'calma' else (1.0, .05, .02, 1)
    bus['roja'].data.energy = 0.0 if estado == 'calma' else 70.0
    bus['azul'].data.energy = 0.0 if estado == 'calma' else 140.0
    t = bus['texto']; mt = t.data.materials[0].node_tree.nodes['Principled BSDF']
    if estado == 'calma':
        t.data.body = 'Flughafen BER  ·  Terminal 1-2'; mt.inputs['Emission Color'].default_value = (.75, .85, 1.0, 1)
    else:
        t.data.body = 'ACHTUNG · UNFALL AM FLUGHAFEN'; mt.inputs['Emission Color'].default_value = (1.0, .05, .02, 1)

# Autor: BS
# Poses y caras compartidas por todos los personajes (vocabulario limitado).
# Coordenadas en el espacio del esqueleto, sin escalar: el personaje mira hacia -y, su izquierda es +x.
# Respaldo del asiento: cara delantera en y = .26; cojín: arriba en z = .40.
from mathutils import Vector

LADO_S = (('I', 1), ('D', -1))
SENT = dict(cadera=(0, .04, -.455), tronco=(-4, 0, 0))
MANOS_S = {s: dict(pos=(sx * .13, -.25, .575), polo=(sx * .5, .8, -.3), dedos=(0, -1, -.12), palma=(0, 0, -1), curl=.18) for s, sx in LADO_S}

def pies_s(piso=.085, adelante=-.37):
    """Pies apoyados; piso: altura del tobillo en el espacio del esqueleto (sube si el personaje es bajito)."""
    return {s: dict(pos=(sx * .10, adelante, piso)) for s, sx in LADO_S}
PIES_S = pies_s()

def sentado(piso=.085, **k):
    d = dict(SENT); d['piernas'] = pies_s(piso); d['brazos'] = dict(MANOS_S); d.update(k); return d

CARAS = {
 '1-calma': dict(parpado=.30),
 '2-atento': dict(parpado=.05, ceja=(.0035, .0035), mirada=(1.5, -6, 1.64)),
 '3-duda': dict(parpado=.16, ceja=(.006, -.001), ceja_int=(-4, 10), comisura=(-10, 2), mirada=(-2.5, -6, 1.6)),
 '4-alarma': dict(parpado=-.10, ceja=(.007, .007), ceja_int=(8, 8), abre=.45, ancho=.8),
 '5-miedo': dict(parpado=-.14, ceja=(.006, .006), ceja_int=(24, 24), comisura=(-14, -14), abre=.85, ancho=.9),
 '6-decision': dict(parpado=.26, ceja=(-.0035, -.0035), ceja_int=(-16, -16), comisura=(-5, -5)),
}

def cara(nombre, **extra):
    d = dict(CARAS[nombre]); d.update(extra); return d

def brazo_aud(o):
    """Owen: mano izquierda al audífono izquierdo."""
    cup = o.sigue('cabeza', (.100, .006, 1.622))
    return dict(pos=tuple(cup + Vector((.070, -.012, -.050))), polo=(.75, -.15, -.65), dedos=(-.42, 0, .9), palma=(-1, 0, .25), curl=.38, pulgar=.3)

def brazo_oreja(o):
    """Mano derecha a la oreja derecha, como quien habla por teléfono."""
    ear = o.sigue('cabeza', (-.094, -.010, 1.612))
    return dict(pos=tuple(ear + Vector((-.060, -.020, -.060))), polo=(-.75, -.15, -.65), dedos=(.40, -.05, .9), palma=(1, 0, .2), curl=.45, pulgar=.35)

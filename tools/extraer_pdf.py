# Autor: BS
"""Extrae notas de un PDF de MuseScore (fuente Leland) usando las posiciones de los glifos.
Uso: python3 -I extraer_pdf.py partitura.pdf salida.json
Solo funciona con PDF digitales exportados de MuseScore/SMuFL; no es OMR para escaneos."""
import json, sys, pdfplumber

NOTA = ''; SOST = ''; NAT = ''; BEMOL = ''
ARMADURA = {'F': 1, 'C': 1}               # Re mayor; TODO: leer de los glifos de la armadura
LETRAS = ['E', 'F', 'G', 'A', 'B', 'C', 'D']
SEMI = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

def leer(ruta):
    p = pdfplumber.open(ruta).pages[0]
    H = p.height
    horiz = sorted({round(l['top'], 2) for l in p.lines
                    if abs(l['top'] - l['bottom']) < .01 and l['x1'] - l['x0'] > 500})
    sistemas = [horiz[i:i + 5] for i in range(0, len(horiz), 5)]
    barras = []
    for l in p.lines:
        if abs(l['x0'] - l['x1']) < .01:
            for si, s in enumerate(sistemas):
                if abs(l['top'] - s[0]) < 3 and abs(l['bottom'] - s[4]) < 3:
                    barras.append((si, l['x0']))
    glifos = []
    for ch in p.chars:
        if ch['fontname'].endswith('Leland') and ch['text'] in (NOTA, SOST, NAT, BEMOL):
            y = H - ch['matrix'][5]            # origen del glifo = centro de la cabeza
            x = ch['matrix'][4]
            si = min(range(len(sistemas)), key=lambda i: abs((sistemas[i][0] + sistemas[i][4]) / 2 - y))
            glifos.append(dict(t=ch['text'], x=x, y=y, s=si, adorno=ch['size'] < 90))
    tallos = [dict(x=l['x0'], y0=l['top'], y1=l['bottom'], adorno=l['linewidth'] < 2)
              for l in p.lines if abs(l['x0'] - l['x1']) < .01 and l['linewidth'] in (2.5, 1.75)]
    vigas = []
    for c in p.curves:
        if c.get('fill') and len(c['pts']) == 4:
            xs = [q[0] for q in c['pts']]; ys = [q[1] for q in c['pts']]
            vigas.append(dict(x0=min(xs), x1=max(xs), y=sum(ys) / 4, adorno=c['linewidth'] < 2))
    extra = []
    for ch in p.chars:
        if ch['fontname'].endswith('Leland') and ch['text'] in ('\ue240', '\ue241', '\ue1e7', '\ue4e4', '\ue4e5', '\ue4e6'):
            extra.append(dict(t=ch['text'], x=ch['matrix'][4], y=H - ch['matrix'][5]))
    return sistemas, barras, glifos, tallos, vigas, extra

def altura(y, sistema):
    pasos = round((sistema[4] - y) / 12.5)      # medios espacios sobre Mi4
    letra = LETRAS[pasos % 7]
    octava = 4 + (pasos + 2) // 7               # Mi4 -> paso 0; Do5 -> paso 5
    return pasos, letra, octava

def duracion(q, tallos, vigas, extra):
    """Duracion en 32avos (negra=8, corchea=4) segun plica, vigas, bandera y puntillo. Sin tresillos."""
    if q['adorno']:
        return 0
    cand = [t for t in tallos if not t['adorno'] and q['x'] - 3 <= t['x'] <= q['x'] + 36
            and t['y0'] - 8 <= q['y'] <= t['y1'] + 8]
    if not cand:
        return None
    t = min(cand, key=lambda t: min(abs(t['x'] - q['x']), abs(t['x'] - q['x'] - 31)))
    arriba = abs(q['y'] - t['y1']) < abs(q['y'] - t['y0'])     # cabeza abajo -> plica hacia arriba
    punta = t['y0'] if arriba else t['y1']
    n = sum(1 for v in vigas if not v['adorno'] and v['x0'] - 2 <= t['x'] <= v['x1'] + 2 and abs(v['y'] - punta) < 45)
    if n == 0 and any(e['t'] in ('\ue240', '\ue241') and abs(e['x'] - t['x']) < 12 and abs(e['y'] - punta) < 30 for e in extra):
        n = 1
    base = 8 // (2 ** n) if n else 8
    punt = any(e['t'] == '\ue1e7' and 0 < e['x'] - q['x'] < 45 and abs(e['y'] - q['y']) < 14 for e in extra)
    return base * 3 // 2 if punt else base

def main(ruta, salida):
    sistemas, barras, glifos, tallos, vigas, extra = leer(ruta)
    out = []
    for si, s in enumerate(sistemas):
        g = sorted((q for q in glifos if q['s'] == si), key=lambda q: q['x'])
        cortes = sorted(x for (b, x) in barras if b == si)
        compas_ini = 0
        acc = {}
        ult = -1
        for q in g:
            comp = sum(1 for x in cortes if x < q['x'] - 1)
            if comp != ult: acc = {}; ult = comp
            pasos, letra, octava = altura(q['y'], s)
            if q['t'] != NOTA:
                acc[(letra, octava)] = {SOST: 1, NAT: 0, BEMOL: -1}[q['t']]
                continue
            alt = acc.get((letra, octava), ARMADURA.get(letra, 0))
            m = 12 * (octava + 1) + SEMI[letra] + alt
            dur = duracion(q, tallos, vigas, extra)
            out.append(dict(sistema=si, dur32=dur, cx=round(q['x'] + 14.75, 1), y=round(q['y'], 1), comp_en_sistema=comp, x=round(q['x'], 1), adorno=q['adorno'],
                            nombre=letra + {1: '#', 0: '', -1: 'b'}[alt] + str(octava), midi=m))
    json.dump(out, open(salida, 'w'), ensure_ascii=False, indent=1)
    return out

if __name__ == '__main__':
    r = main(sys.argv[1], sys.argv[2])
    print(len(r), 'notas')

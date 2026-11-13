# Autor: BS
"""Arma docs/prototipo-campanella.html a partir de un PDF de MuseScore.
Uso: python3 -I tools/construir_prototipo.py partitura.pdf docs/prototipo-campanella.html ave.svg"""
import json, os, re, subprocess, sys, tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import extraer_pdf

VISTA = "150 140 2800 840"          # sistemas 0 y 1 de la hoja (coordenadas del PDF)
TEMA = range(1, 10)                  # compases 1 a 9 (primera vuelta)
BASE_COMP = {0: 1, 1: 6}             # primer compás de cada sistema usado

def main(pdf, salida, ave_svg):
    tmp = tempfile.mkdtemp()
    subprocess.run(['pdftocairo', '-svg', pdf, os.path.join(tmp, 'p.svg')], check=True)
    svg = open(os.path.join(tmp, 'p.svg')).read()
    svg = re.sub(r'<\?xml[^>]*\?>\s*', '', svg)
    svg = re.sub(r'<svg [^>]*>', f'<svg id="partitura" viewBox="{VISTA}" role="img" '
                 'aria-label="Primeros diez compases de La Campanella">', svg, count=1)
    svg = svg.replace('rgb(0%, 0%, 0%)', 'currentColor')

    notas = extraer_pdf.main(pdf, os.path.join(tmp, 'n.json'))
    comps = {}
    for q in notas:
        comps.setdefault(q['sistema'], set()).add(q['comp_en_sistema'])
    rango = {s: {c: i for i, c in enumerate(sorted(v))} for s, v in comps.items()}
    for q in notas:
        q['c'] = BASE_COMP.get(q['sistema'], 0) + rango[q['sistema']][q['comp_en_sistema']] if q['sistema'] in BASE_COMP else None

    tema = [q for q in notas if q['c'] in TEMA]
    suma = {}
    for q in tema:
        suma[q['c']] = suma.get(q['c'], 0) + q['dur32']
    completos = [c for c, v in suma.items() if v == 24]
    assert len(completos) == 8 and suma[1] == 16, suma       # compás 1 anacrusa, 2 a 9 en 6/8

    datos = [dict(m=q['midi'], n=q['nombre'], d=q['dur32'], g=1 if q['adorno'] else 0,
                  cx=q['cx'], y=q['y'], c=q['c'], s=q['sistema']) for q in tema]
    ave = open(ave_svg).read().strip().replace('<svg ', '<svg class="ave" ', 1)
    reg = [q for q in notas if not q['adorno']]
    lo = min(notas, key=lambda q: q['midi'])['nombre']; hi = max(notas, key=lambda q: q['midi'])['nombre']
    es = {'C': 'Do', 'D': 'Re', 'E': 'Mi', 'F': 'Fa', 'G': 'Sol', 'A': 'La', 'B': 'Si'}
    nom = lambda n: es[n[0]] + ('♯' if n[1] == '#' else '') + n[-1]

    html = open(os.path.join(AQUI, 'plantilla_prototipo.html')).read()
    for k, v in {'{{PARTITURA_SVG}}': svg, '{{NOTAS_JSON}}': json.dumps(datos, separators=(',', ':')),
                 '{{AVE}}': ave, '{{N_NOTAS}}': str(len(notas)), '{{N_REG}}': str(len(reg)),
                 '{{N_ADORNO}}': str(len(notas) - len(reg)), '{{RANGO}}': f'{nom(lo)} a {nom(hi)}',
                 '{{N_COMP_OK}}': str(len(completos))}.items():
        html = html.replace(k, v)
    open(salida, 'w').write(html)
    print(len(datos), 'notas del tema;', len(html) // 1024, 'KB;', 'rango', lo, hi)

if __name__ == '__main__':
    main(*sys.argv[1:4])

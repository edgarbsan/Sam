# Autor: BS — arma simulador.html (página para Artifact) e index.html (archivo independiente)
import pathlib
here = pathlib.Path(__file__).parent
assets = here
s = (here/'simulador.template.html').read_text()
for tag, f in [('{{AVE_TOSTADO}}','ave-chica-tostado.svg'),('{{AVE_DURAZNO}}','ave-chica-durazno.svg')]:
    s = s.replace(tag, (assets/f).read_text().strip())
(here.parent/'simulador.html').write_text(s)
fav = (assets/'ave-chica-durazno.svg').read_text().strip().replace('#','%23').replace('"',"'")
head = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="theme-color" content="#000000">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'
        f'<link rel="icon" href="data:image/svg+xml,{fav}">\n'
        '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>\n')
title_end = s.index('</title>') + len('</title>')
out = head + s[:title_end] + s[title_end:].replace('<header', '</head>\n<body>\n<header', 1) + '\n</body>\n</html>\n'
(here.parent/'index.html').write_text(out)

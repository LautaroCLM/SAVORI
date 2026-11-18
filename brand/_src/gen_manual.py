"""Genera la lámina visual del manual: brand/manual.html (+ manual.png con render_png.py).

    python brand/_src/gen_manual.py
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
SVG = ROOT / "svg"
WEB = ROOT / "web"


def inline(path: Path, height: int | None = None, width: int | None = None, cls: str = "") -> str:
    s = path.read_text(encoding="utf-8")
    s = re.sub(r"<title>.*?</title>\n?", "", s)
    size = (f' height="{height}"' if height else "") + (f' width="{width}"' if width else "")
    return s.replace("<svg ", f'<svg{size} class="{cls}" ', 1).strip()


def tile(bg: str, body: str, label: str, fg: str = "#1B1613") -> str:
    return f'<figure><div class="tile" style="background:{bg};color:{fg}">{body}</div><figcaption>{label}</figcaption></figure>'


swatches = [
    ("Naranja Savori", "#FF5B14", "#1B1613", "Marca · gráficos y texto grande"),
    ("Naranja intenso", "#CC4309", "#FFFFFF", "Acción en la interfaz · AA con blanco"),
    ("Naranja profundo", "#A83507", "#FFFFFF", "Hover · texto naranja sobre claro"),
    ("Carbón", "#1B1613", "#FFF6EF", "Texto y nombre del logo"),
    ("Carbón profundo", "#14110F", "#FFF6EF", "Fondos oscuros"),
    ("Crema", "#FFF6EF", "#1B1613", "Fondo cálido"),
    ("Tinte", "#FFE6D9", "#1B1613", "Acentos suaves"),
]
sw_html = "".join(
    f'<div class="sw" style="background:{h};color:{fg}"><b>{n}</b><span>{h}</span><small>{d}</small></div>'
    for n, h, fg, d in swatches
)

html = f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Savori · Manual de identidad</title>
<style>
*{{box-sizing:border-box}} body{{margin:0;background:#FAF8F6;color:#1B1613;font:15px/1.5 Inter,system-ui,"Segoe UI",sans-serif}}
.wrap{{max-width:1300px;margin:0 auto;padding:56px 48px 72px}}
h1{{font-size:34px;letter-spacing:-.01em;margin:0}} h2{{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#CC4309;margin:56px 0 18px}}
.lead{{color:#6B625C;max-width:720px;margin:8px 0 0}}
.hero{{display:grid;grid-template-columns:1.4fr 1fr;gap:20px;margin-top:28px}}
.hero .big{{background:#fff;border:1px solid #ECE6E1;border-radius:20px;display:flex;align-items:center;justify-content:center;padding:56px}}
.hero .dk{{background:#14110F;border-radius:20px;display:flex;align-items:center;justify-content:center;padding:40px}}
.grid{{display:grid;gap:16px}} .g4{{grid-template-columns:repeat(4,1fr)}} .g5{{grid-template-columns:repeat(5,1fr)}} .g3{{grid-template-columns:repeat(3,1fr)}}
figure{{margin:0}} figcaption{{font-size:12px;color:#6B625C;margin-top:8px}}
.tile{{border-radius:16px;border:1px solid #ECE6E1;display:flex;align-items:center;justify-content:center;height:150px;padding:20px}}
.tile svg{{max-width:100%;max-height:100%}}
.sw{{border-radius:14px;padding:16px;min-height:150px;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;border:1px solid rgba(0,0,0,.06)}}
.sw span{{font-family:ui-monospace,Consolas,monospace;font-size:13px}} .sw small{{opacity:.8;font-size:11px;line-height:1.3}}
.pal{{display:grid;grid-template-columns:repeat(7,1fr);gap:12px}}
.clear{{background:#fff;border:1px solid #ECE6E1;border-radius:20px;padding:40px;display:flex;gap:40px;align-items:center}}
.clear .box{{position:relative;padding:28px;outline:1.5px dashed #FF5B14;outline-offset:0}}
.clear p{{margin:0;color:#6B625C;max-width:420px}}
.icons{{display:flex;gap:28px;align-items:flex-end;background:#fff;border:1px solid #ECE6E1;border-radius:20px;padding:32px}}
.icons figure{{text-align:center}}
.dont{{position:relative}} .dont .x{{position:absolute;top:8px;right:10px;color:#CC4309;font-weight:700;font-size:18px}}
</style></head><body><div class="wrap">
<h1>Savori · Identidad visual</h1>
<p class="lead">Concepto <b>Ruta</b>: una S de un solo gesto que arranca en un punto suelto, el pedido recorriendo el servicio.
El punto es la firma de la marca y se repite en la “i” del nombre.</p>

<div class="hero"><div class="big">{inline(SVG/'savori-horizontal.svg', height=120)}</div>
<div class="dk">{inline(SVG/'savori-horizontal-dark.svg', height=90)}</div></div>

<h2>Paleta</h2><div class="pal">{sw_html}</div>

<h2>Logotipos</h2>
<div class="grid g4">
{tile('#fff', inline(SVG/'savori-horizontal.svg', height=56), 'Horizontal (principal)')}
{tile('#fff', inline(SVG/'savori-vertical.svg', height=112), 'Vertical')}
{tile('#fff', inline(SVG/'savori-symbol.svg', height=112), 'Isotipo')}
{tile('#fff', inline(SVG/'savori-wordmark.svg', height=44), 'Wordmark')}
</div>

<h2>Versiones de color</h2>
<div class="grid g5">
{tile('#fff', inline(SVG/'savori-horizontal.svg', height=40), 'Fondo claro')}
{tile('#14110F', inline(SVG/'savori-horizontal-dark.svg', height=40), 'Fondo oscuro (-dark)')}
{tile('#FF5B14', inline(SVG/'savori-horizontal-white.svg', height=40), 'Sobre naranja (-white)')}
{tile('#FFF6EF', inline(SVG/'savori-horizontal-black.svg', height=40), 'Un color negro (-black)')}
{tile('#fff', inline(SVG/'savori-horizontal-orange.svg', height=40), 'Un color naranja (-orange)')}
</div>

<h2>Espacio de seguridad y tamaños mínimos</h2>
<div class="clear">
<div class="box">{inline(SVG/'savori-horizontal.svg', height=84)}</div>
<div><p><b>Espacio de seguridad = 1 × X</b>, donde X es el diámetro del punto del símbolo (≈ 1/6 de su altura).<br><br>
<b>Mínimos digitales:</b> horizontal 96 px · vertical 64 px · símbolo 24 px (16 px solo en tile naranja).<br>
<b>Mínimos impresos:</b> horizontal 25 mm · símbolo 6 mm.</p>
<div style="display:flex;gap:22px;align-items:flex-end;margin-top:22px">
{inline(SVG/'savori-horizontal.svg', width=96)}{inline(SVG/'savori-vertical.svg', width=64)}{inline(SVG/'savori-symbol.svg', height=24)}</div></div>
</div>

<h2>Favicon e icono de app</h2>
<div class="icons">
<figure><img src="web/icon-512.png" width="160" style="border-radius:36px" alt=""><figcaption>Icono de app (512)</figcaption></figure>
<figure><img src="web/apple-touch-icon.png" width="90" style="border-radius:20px" alt=""><figcaption>Apple touch (180)</figcaption></figure>
<figure><img src="web/favicon-48.png" width="48" alt=""><figcaption>48</figcaption></figure>
<figure><img src="web/favicon-32.png" width="32" alt=""><figcaption>32</figcaption></figure>
<figure><img src="web/favicon-16.png" width="16" alt=""><figcaption>16</figcaption></figure>
</div>

<h2>Qué no hacer</h2>
<div class="grid g4">
<figure class="dont"><div class="tile" style="background:#14110F"><span class="x">✕</span>{inline(SVG/'savori-horizontal.svg', height=44)}</div><figcaption>Versión clara sobre oscuro: el punto desaparece</figcaption></figure>
<figure class="dont"><div class="tile" style="background:#FF5B14"><span class="x">✕</span>{inline(SVG/'savori-horizontal.svg', height=44)}</div><figcaption>Versión clara sobre naranja: la S desaparece</figcaption></figure>
<figure class="dont"><div class="tile"><span class="x">✕</span><div style="transform:scaleX(1.5)">{inline(SVG/'savori-symbol.svg', height=100)}</div></div><figcaption>Estirar o deformar</figcaption></figure>
<figure class="dont"><div class="tile"><span class="x">✕</span><div style="transform:rotate(-14deg)">{inline(SVG/'savori-horizontal.svg', height=44)}</div></div><figcaption>Rotar o inclinar</figcaption></figure>
</div>
</div></body></html>
"""
(ROOT / "manual.html").write_text(html, encoding="utf-8")
print("manual.html listo")

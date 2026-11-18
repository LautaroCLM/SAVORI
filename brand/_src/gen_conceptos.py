"""Genera los 3 conceptos de Savori como SVG (símbolo + lockup horizontal).

    python brand/_src/gen_conceptos.py

Salida: brand/concepts/{a,b,c}-symbol.svg y {a,b,c}-lockup.svg
Los lockups usan un wordmark monolínea geométrico (trazos) común a los tres
conceptos, para que la comparación sea solo del símbolo.
"""
from math import sin, cos, radians
from pathlib import Path

ORANGE = "#FF5B14"
ORANGE_TINT = "#FFC7AD"
INK = "#1B1613"
OUT = Path(__file__).resolve().parent.parent / "concepts"
OUT.mkdir(parents=True, exist_ok=True)


def f(n: float) -> str:
    return f"{n:.2f}".rstrip("0").rstrip(".")


def svg(w: int, h: int, body: str, title: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{title}">\n'
        f"<title>{title}</title>\n{body}\n</svg>\n"
    )


# --------------------------------------------------------------------------- A · Giro
def symbol_a() -> str:
    c, g = 100, 12  # tamaño de celda y separación
    o = (256 - (2 * c + g)) / 2
    x0, x1 = o, o + c + g
    y0, y1 = o, o + c + g
    r = c
    blades = [
        # TL: esquina redonda arriba-derecha
        (f"M{f(x0)} {f(y0 + c)}V{f(y0)}A{r} {r} 0 0 1 {f(x0 + c)} {f(y0 + c)}Z", ORANGE),
        # TR: esquina redonda abajo-derecha
        (f"M{f(x1)} {f(y0)}H{f(x1 + c)}A{r} {r} 0 0 1 {f(x1)} {f(y0 + c)}Z", ORANGE),
        # BR: esquina redonda abajo-izquierda
        (f"M{f(x1 + c)} {f(y1)}V{f(y1 + c)}A{r} {r} 0 0 1 {f(x1)} {f(y1)}Z", ORANGE),
        # BL: esquina redonda arriba-izquierda (la "libre", en tinte)
        (f"M{f(x0 + c)} {f(y1 + c)}H{f(x0)}A{r} {r} 0 0 1 {f(x0 + c)} {f(y1)}Z", ORANGE_TINT),
    ]
    return "".join(f'<path d="{d}" fill="{col}"/>\n' for d, col in blades).rstrip("\n")


# --------------------------------------------------------------------------- B · Ruta
def symbol_b() -> str:
    """S de un solo trazo, ya como contorno relleno (arcos circulares exactos).

    Línea central: arco 270° antihorario sobre C1 (arriba) + arco horario sobre C2 (abajo)
    que termina a phi=205°, y un punto suelto en phi=270° de C2.
    """
    cx, c1y, c2y = 128, 84, 172
    r, w = 44, 36
    ro, ri, rc = r + w / 2, r - w / 2, w / 2  # radio exterior, interior y de la tapa
    phi = radians(205)
    ux, uy = sin(phi), -cos(phi)  # vector radial en el extremo
    ex, ey = cx + ri * ux, c2y + ri * uy  # extremo, lado interior
    fx, fy = cx + ro * ux, c2y + ro * uy  # extremo, lado exterior
    d = (
        f"M{cx + ro:g} {c1y}"
        f"A{ro:g} {ro:g} 0 1 0 {cx} {c2y - ri:g}"
        f"A{ri:g} {ri:g} 0 1 1 {f(ex)} {f(ey)}"
        f"A{rc:g} {rc:g} 0 0 0 {f(fx)} {f(fy)}"
        f"A{ro:g} {ro:g} 0 1 0 {cx} {c2y - ro:g}"
        f"A{ri:g} {ri:g} 0 1 1 {cx + ri:g} {c1y}"
        f"A{rc:g} {rc:g} 0 0 0 {cx + ro:g} {c1y}Z"
    )
    return (
        f'<path d="{d}" fill="{ORANGE}"/>\n'
        f'<circle cx="{cx - r}" cy="{c2y}" r="{rc:g}" fill="{INK}"/>'
    )


# --------------------------------------------------------------------------- C · Plano
def symbol_c() -> str:
    # Cuadrado redondeado (el plano del salón) + círculo (la mesa) que le muerde la esquina.
    # Un solo trazado con fill-rule evenodd: la intersección queda como hueco real.
    sq = "M60 30H130A30 30 0 0 1 160 60V130A30 30 0 0 1 130 160H60A30 30 0 0 1 30 130V60A30 30 0 0 1 60 30Z"
    ci = "M94 160A66 66 0 1 0 226 160A66 66 0 1 0 94 160Z"
    return f'<path fill-rule="evenodd" d="{sq}{ci}" fill="{ORANGE}"/>'


# --------------------------------------------------------------------------- Wordmark "savori"
STROKE = 18  # grosor de trazo del wordmark (x-height = 100)


def wordmark(x: float, baseline: float, k: float, color=INK, dot=ORANGE) -> tuple[str, float]:
    """Devuelve (svg, ancho). Coordenadas locales: x-height 100, baseline y=100."""
    glyphs = []
    pos = 0.0

    def put(path: str, ink_l: float, ink_r: float, gap_before: float, extra=""):
        nonlocal pos
        pos += gap_before
        dx = pos - ink_l
        glyphs.append((dx, path, extra))
        pos += ink_r - ink_l

    s_path = "M80 29.5A30 20.5 0 1 0 50 50A30 20.5 0 1 1 20 70.5"
    put(s_path, 11, 89, 0)
    put("M91 0V100M91 50A41 41 0 1 1 90.99 50", 0, 100, 14, "a")
    put("M9 9L50 91L91 9", 0, 100, 8)
    put("M50 9A41 41 0 1 0 50 91A41 41 0 1 0 50 9", 0, 100, 8)
    put("M9 9V91M9 50A41 41 0 0 1 50 9", 0, 59, 16)
    put("M9 9V91", 0, 18, 14, "i")
    width = pos

    body = []
    for dx, path, extra in glyphs:
        caps = ' stroke-linecap="butt"' if extra == "a" else ' stroke-linecap="round"'
        if extra == "a":
            body.append(
                f'<path transform="translate({f(dx)} 0)" d="M91 0V100" stroke-linecap="butt"/>'
                f'<circle transform="translate({f(dx)} 0)" cx="50" cy="50" r="41"/>'
            )
        elif extra == "i":
            body.append(
                f'<path transform="translate({f(dx)} 0)" d="M9 9V91" stroke-linecap="round"/>'
                f'<circle transform="translate({f(dx)} 0)" cx="9" cy="-27" r="11" fill="{dot}" stroke="none"/>'
            )
        else:
            join = ' stroke-linejoin="round"'
            body.append(f'<path transform="translate({f(dx)} 0)" d="{path}"{caps}{join}/>')
    g = (
        f'<g transform="translate({f(x)} {f(baseline - 100 * k)}) scale({k:g})" fill="none" '
        f'stroke="{color}" stroke-width="{STROKE}">\n' + "\n".join(body) + "\n</g>"
    )
    return g, width * k


def lockup(symbol_body: str, name: str) -> str:
    k = 1.1
    gap = 56
    baseline = 128 + 55 * 1 + 0  # x-height centrada con el símbolo (x-height*k = 110)
    wm, w = wordmark(256 + gap, baseline, k)
    total = int(256 + gap + w + 8)
    return svg(total, 256, symbol_body + "\n" + wm, f"Savori — {name}")


concepts = {
    "a": ("Giro", symbol_a()),
    "b": ("Ruta", symbol_b()),
    "c": ("Plano", symbol_c()),
}

for key, (name, body) in concepts.items():
    (OUT / f"{key}-symbol.svg").write_text(svg(256, 256, body, f"Savori — {name}"), encoding="utf-8")
    (OUT / f"{key}-lockup.svg").write_text(lockup(body, name), encoding="utf-8")
    print("ok", key, name)

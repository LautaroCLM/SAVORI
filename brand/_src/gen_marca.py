"""Savori · generador del kit de marca (concepto B · Ruta).

    python brand/_src/gen_marca.py

Genera en brand/svg/ todas las variantes como SVG limpios (solo <path>/<circle> rellenos,
sin trazos, sin texto, sin filtros). Todo se construye con geometría exacta:

  * Símbolo: S de un solo gesto (dos arcos circulares apilados) + punto suelto.
  * Wordmark "savori": letras monolínea geométricas, convertidas a contornos.
    Solo la "s" usa elipses; su contorno se ajusta con Béziers (error < 0.02 u).
"""
from __future__ import annotations

import math
from pathlib import Path as FsPath

ORANGE = "#FF5B14"
INK = "#1B1613"
CREAM = "#FFF6EF"
OUT = FsPath(__file__).resolve().parent.parent / "svg"
OUT.mkdir(parents=True, exist_ok=True)


def n(v: float) -> str:
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


# --------------------------------------------------------------------------- Path mínimo
class Path:
    def __init__(self):
        self.c: list[tuple] = []

    def M(self, x, y):
        self.c.append(("M", x, y)); return self

    def L(self, x, y):
        self.c.append(("L", x, y)); return self

    def A(self, r, large, sweep, x, y):
        self.c.append(("A", r, large, sweep, x, y)); return self

    def C(self, x1, y1, x2, y2, x, y):
        self.c.append(("C", x1, y1, x2, y2, x, y)); return self

    def Z(self):
        self.c.append(("Z",)); return self

    def extend(self, other: "Path"):
        self.c.extend(other.c); return self

    def tf(self, k=1.0, dx=0.0, dy=0.0) -> "Path":
        p = Path()
        for s in self.c:
            t = s[0]
            if t in ("M", "L"):
                p.c.append((t, s[1] * k + dx, s[2] * k + dy))
            elif t == "A":
                p.c.append(("A", s[1] * k, s[2], s[3], s[4] * k + dx, s[5] * k + dy))
            elif t == "C":
                p.c.append(("C", s[1] * k + dx, s[2] * k + dy, s[3] * k + dx, s[4] * k + dy, s[5] * k + dx, s[6] * k + dy))
            else:
                p.c.append(s)
        return p

    def d(self) -> str:
        out = []
        for s in self.c:
            t = s[0]
            if t in ("M", "L"):
                out.append(f"{t}{n(s[1])} {n(s[2])}")
            elif t == "A":
                out.append(f"A{n(s[1])} {n(s[1])} 0 {s[2]} {s[3]} {n(s[4])} {n(s[5])}")
            elif t == "C":
                out.append("C" + " ".join(n(v) for v in s[1:]))
            else:
                out.append("Z")
        return "".join(out)


def circle_path(cx, cy, r) -> Path:
    return Path().M(cx - r, cy).A(r, 1, 1, cx + r, cy).A(r, 1, 1, cx - r, cy).Z()


# --------------------------------------------------------------------------- Símbolo
def symbol(r=44, w=36, phi_end=205, dot_r=None):
    """S de un gesto sobre canvas 256. Devuelve (Path de la S, (cx, cy, r) del punto)."""
    cx, c1y, c2y = 128, 128 - r, 128 + r
    ro, ri, rc = r + w / 2, r - w / 2, w / 2
    ph = math.radians(phi_end)
    ux, uy = math.sin(ph), -math.cos(ph)
    ex, ey = cx + ri * ux, c2y + ri * uy
    fx, fy = cx + ro * ux, c2y + ro * uy
    s = (
        Path()
        .M(cx + ro, c1y)
        .A(ro, 1, 0, cx, c2y - ri)  # arco exterior superior, 270° antihorario
        .A(ri, 1, 1, ex, ey)  # arco interior inferior, horario hasta phi
        .A(rc, 0, 0, fx, fy)  # tapa del extremo
        .A(ro, 1, 0, cx, c2y - ro)  # vuelta por el exterior inferior
        .A(ri, 1, 1, cx + ri, c1y)  # vuelta por el interior superior
        .A(rc, 0, 0, cx + ro, c1y)  # tapa del arranque
        .Z()
    )
    return s, (cx - r, c2y, dot_r if dot_r is not None else rc)


# --------------------------------------------------------------------------- Ajuste de Béziers (para la "s")
def _bez(p0, p1, p2, p3, u):
    a, b, c, d = (1 - u) ** 3, 3 * u * (1 - u) ** 2, 3 * u * u * (1 - u), u**3
    return (a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1])


def fit_cubic(q, t0, t3):
    """Ajusta un cúbico a los puntos q con tangentes unitarias de extremo t0 (salida) y t3 (llegada)."""
    p0, p3 = q[0], q[-1]
    dist = [0.0]
    for i in range(1, len(q)):
        dist.append(dist[-1] + math.dist(q[i], q[i - 1]))
    u = [v / dist[-1] for v in dist]
    c11 = c12 = c22 = x1 = x2 = 0.0
    for (px, py), ui in zip(q, u):
        b0, b1, b2, b3 = (1 - ui) ** 3, 3 * ui * (1 - ui) ** 2, 3 * ui * ui * (1 - ui), ui**3
        a1 = (t0[0] * b1, t0[1] * b1)
        a2 = (-t3[0] * b2, -t3[1] * b2)
        tx = px - ((b0 + b1) * p0[0] + (b2 + b3) * p3[0])
        ty = py - ((b0 + b1) * p0[1] + (b2 + b3) * p3[1])
        c11 += a1[0] ** 2 + a1[1] ** 2
        c12 += a1[0] * a2[0] + a1[1] * a2[1]
        c22 += a2[0] ** 2 + a2[1] ** 2
        x1 += a1[0] * tx + a1[1] * ty
        x2 += a2[0] * tx + a2[1] * ty
    det = c11 * c22 - c12 * c12
    al1 = (x1 * c22 - x2 * c12) / det
    al2 = (c11 * x2 - c12 * x1) / det
    return (p0, (p0[0] + al1 * t0[0], p0[1] + al1 * t0[1]), (p3[0] - al2 * t3[0], p3[1] - al2 * t3[1]), p3)


MAX_ERR = 0.0


def offset_ellipse_segments(cx, cy, rx, ry, d, ta, tb, steps):
    """Béziers que siguen la curva paralela (a distancia d>0 exterior / d<0 interior) de una elipse,
    recorrida de ta a tb (grados, en coords de pantalla)."""
    global MAX_ERR

    def pt(t):
        r = math.radians(t)
        px, py = cx + rx * math.cos(r), cy + ry * math.sin(r)
        nx, ny = math.cos(r) / rx, math.sin(r) / ry
        m = math.hypot(nx, ny)
        return (px + d * nx / m, py + d * ny / m)

    sign = 1 if tb > ta else -1

    def tan(t):
        r = math.radians(t)
        tx, ty = -rx * math.sin(r), ry * math.cos(r)
        m = math.hypot(tx, ty)
        return (sign * tx / m, sign * ty / m)

    segs = []
    for i in range(steps):
        a = ta + (tb - ta) * i / steps
        b = ta + (tb - ta) * (i + 1) / steps
        q = [pt(a + (b - a) * j / 24) for j in range(25)]
        p0, p1, p2, p3 = fit_cubic(q, tan(a), tan(b))
        dense_true = [pt(a + (b - a) * j / 400) for j in range(401)]
        for j in range(0, 101):
            bp = _bez(p0, p1, p2, p3, j / 100)
            MAX_ERR = max(MAX_ERR, min(math.dist(bp, tp) for tp in dense_true))
        segs.append((p1, p2, p3))
    return segs


# --------------------------------------------------------------------------- Wordmark "savori"
# Coordenadas locales: x-height = 100, línea base y = 100, trazo = 18.
H = 9.0


def g_s() -> Path:
    c1, c2, rx, ry = (50, 29.5), (50, 70.5), 30, 20.5
    p = Path().M(c1[0] + rx + H, c1[1])
    for p1, p2, p3 in offset_ellipse_segments(*c1, rx, ry, +H, 0, -270, 6):
        p.C(*p1, *p2, *p3)
    for p1, p2, p3 in offset_ellipse_segments(*c2, rx, ry, -H, -90, 180, 6):
        p.C(*p1, *p2, *p3)
    p.A(H, 0, 0, c2[0] - rx - H, c2[1])  # tapa del extremo (abajo-izquierda)
    for p1, p2, p3 in offset_ellipse_segments(*c2, rx, ry, +H, 180, -90, 6):
        p.C(*p1, *p2, *p3)
    for p1, p2, p3 in offset_ellipse_segments(*c1, rx, ry, -H, -270, 0, 6):
        p.C(*p1, *p2, *p3)
    p.A(H, 0, 0, c1[0] + rx + H, c1[1])  # tapa del arranque (arriba-derecha)
    return p.Z()


def g_a() -> Path:
    ro, ri = 50, 32
    dy = math.sqrt(ro**2 - 32**2)  # y de intersección del círculo con x=82
    outer = (
        Path().M(82, 0).L(100, 0).L(100, 100).L(82, 100).L(82, 50 + dy)
        .A(ro, 1, 1, 82, 50 - dy).Z()
    )
    return outer.extend(circle_path(50, 50, ri))


def g_v() -> Path:
    p0, p1, p2 = (9, 9), (50, 91), (91, 9)
    L = math.hypot(41, 82)
    d1 = (41 / L, 82 / L)
    d2 = (41 / L, -82 / L)
    nl = (-d1[1], d1[0])  # normal exterior del tramo 1 (izq-abajo)
    nr = (-d2[1], d2[0])  # normal exterior del tramo 2 (der-abajo)
    # exteriores
    o0 = (p0[0] + H * nl[0], p0[1] + H * nl[1])
    o1 = (p1[0] + H * nl[0], p1[1] + H * nl[1])
    o1b = (p1[0] + H * nr[0], p1[1] + H * nr[1])
    o2 = (p2[0] + H * nr[0], p2[1] + H * nr[1])
    # interiores
    i2 = (p2[0] - H * nr[0], p2[1] - H * nr[1])
    i0 = (p0[0] - H * nl[0], p0[1] - H * nl[1])
    # vértice interior: intersección de las dos rectas interiores (x = 50 por simetría)
    t = (50 - i0[0]) / d1[0]
    xi = (50, i0[1] + t * d1[1])
    return (
        Path().M(*o0).L(*o1).A(H, 0, 0, *o1b).L(*o2).A(H, 0, 0, *i2).L(*xi).L(*i0).A(H, 0, 0, *o0).Z()
    )


def g_o() -> Path:
    return circle_path(50, 50, 50).extend(circle_path(50, 50, 32))


def g_r() -> Path:
    y_out = 50 - math.sqrt(50**2 - 32**2)  # y donde el borde derecho del fuste corta el arco exterior
    return (
        Path().M(0, 9).A(H, 0, 1, 18, 9).L(18, y_out)
        .A(50, 0, 1, 50, 0)  # borde exterior del brazo
        .A(H, 0, 1, 50, 18)  # tapa del brazo
        .A(32, 0, 0, 18, 50)  # borde interior del brazo
        .L(18, 91).A(H, 0, 1, 0, 91).Z()
    )


def g_i() -> Path:
    return Path().M(0, 9).A(H, 0, 1, 18, 9).L(18, 91).A(H, 0, 1, 0, 91).Z()


GLYPHS = [  # (constructor, ink_left, ink_right, hueco antes)
    (g_s, 11, 89, 0),
    (g_a, 0, 100, 14),
    (g_v, 0, 100, 8),
    (g_o, 0, 100, 8),
    (g_r, 0, 59, 16),
    (g_i, 0, 18, 14),
]
DOT_LOCAL = (9, -27, 11)  # punto de la "i": cx, cy, r
WM_WIDTH = 0.0


def wordmark(k: float, x: float, baseline: float):
    """(Path de tinta, (cx, cy, r) del punto de la i) con el wordmark ubicado y escalado."""
    global WM_WIDTH
    ink = Path()
    pos = 0.0
    dot = None
    for ctor, il, ir, gap in GLYPHS:
        pos += gap
        dx = pos - il
        ink.extend(ctor().tf(k, x + dx * k, baseline - 100 * k))
        if ctor is g_i:
            dot = ((x + (dx + DOT_LOCAL[0]) * k), baseline - 100 * k + DOT_LOCAL[1] * k, DOT_LOCAL[2] * k)
        pos += ir - il
    WM_WIDTH = pos + 2  # el punto de la i (r=11) sobresale 2 u a cada lado del fuste
    return ink, dot


# --------------------------------------------------------------------------- Composición y colores
TONES = {
    # nombre: (S, punto del símbolo, wordmark, punto de la i)
    "": (ORANGE, INK, INK, ORANGE),  # fondos claros (por defecto)
    "-dark": (ORANGE, CREAM, CREAM, ORANGE),  # fondos oscuros
    "-black": ("#000000",) * 4,
    "-white": ("#FFFFFF",) * 4,
    "-orange": (ORANGE,) * 4,
}


def doc(vb, items, title, tone):
    """items: lista de (rol, Path|circulo). roles: s, sd, wm, wd."""
    colors = dict(zip(("s", "sd", "wm", "wd"), TONES[tone]))
    x0, y0, w, h = vb
    w, h = math.ceil(w - 1e-6), math.ceil(h - 1e-6)  # lienzos enteros
    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n(w)} {n(h)}" role="img" aria-label="{title}">',
        f"<title>{title}</title>",
    ]
    for rol, geom in items:
        g = geom
        if isinstance(g, Path):
            g = g.tf(1, -x0, -y0)
            rule = ' fill-rule="evenodd"' if rol == "wm" else ""
            out.append(f'<path{rule} fill="{colors[rol]}" d="{g.d()}"/>')
        else:
            cx, cy, r = g
            out.append(f'<circle fill="{colors[rol]}" cx="{n(cx - x0)}" cy="{n(cy - y0)}" r="{n(r)}"/>')
    out.append("</svg>")
    return "\n".join(out) + "\n"


def build():
    S, sdot = symbol()
    SX0, SY0, SX1, SY1 = 66, 22, 190, 234  # caja exacta del símbolo

    files: dict[str, str] = {}

    # Símbolo
    for tone in TONES:
        files[f"savori-symbol{tone}.svg"] = doc(
            (SX0, SY0, SX1 - SX0, SY1 - SY0), [("s", S), ("sd", sdot)], "Savori — isotipo", tone
        )

    # Horizontal: símbolo + wordmark con la x-height centrada en el símbolo
    k, gap = 1.1, 52
    wm_x = SX1 + gap
    ink, idot = wordmark(k, wm_x, 128 + 50 * k)
    wm_right = wm_x + WM_WIDTH * k
    for tone in TONES:
        files[f"savori-horizontal{tone}.svg"] = doc(
            (SX0, SY0, wm_right - SX0, SY1 - SY0),
            [("s", S), ("sd", sdot), ("wm", ink), ("wd", idot)],
            "Savori", tone,
        )

    # Vertical: símbolo arriba, wordmark centrado abajo
    kv = 0.70
    wm_w = None
    ink_v0, _ = wordmark(kv, 0, 0)  # solo para medir el ancho
    wm_w = WM_WIDTH * kv
    top_dot = 234 + 40  # y del borde superior del punto de la i
    baseline_v = top_dot + 38 * kv + 100 * kv
    sx_shift = wm_w / 2 - 128  # centra el símbolo sobre el wordmark
    S_v, sdot_v = S.tf(1, sx_shift, 0), (sdot[0] + sx_shift, sdot[1], sdot[2])
    ink_v, idot_v = wordmark(kv, 0, baseline_v)
    for tone in TONES:
        files[f"savori-vertical{tone}.svg"] = doc(
            (min(0, SX0 + sx_shift), SY0, wm_w, baseline_v - SY0),
            [("s", S_v), ("sd", sdot_v), ("wm", ink_v), ("wd", idot_v)],
            "Savori", tone,
        )

    # Wordmark solo
    ink_w, idot_w = wordmark(1.0, 0, 100)
    for tone in ("", "-dark", "-black", "-white", "-orange"):
        files[f"savori-wordmark{tone}.svg"] = doc(
            (0, -38, WM_WIDTH, 138), [("wm", ink_w), ("wd", idot_w)], "Savori", tone
        )

    # Corte chico para tiles (favicon / icono de app): S más gruesa, punto más separado.
    # S en blanco y punto en tinta, pensado para ir sobre el naranja de marca.
    Ss, sdot_s = symbol(r=44, w=42, phi_end=195)
    ssd = (sdot_s[0], sdot_s[1], 21)
    TONES["-tile"] = ("#FFFFFF", INK, INK, ORANGE)
    files["savori-symbol-tile.svg"] = doc((63, 19, 130, 218), [("s", Ss), ("sd", ssd)], "Savori — isotipo para iconos", "-tile")
    return files


if __name__ == "__main__":
    files = build()
    for name, text in files.items():
        (OUT / name).write_text(text, encoding="utf-8")
    print(f"{len(files)} archivos en {OUT}")
    print(f"error máximo del ajuste de la 's': {MAX_ERR:.4f} u (sobre x-height 100)")

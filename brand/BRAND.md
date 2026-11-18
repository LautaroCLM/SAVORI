# Savori · Manual de identidad (mini)

> Concepto: **Ruta**. Una S dibujada de un solo gesto que arranca en un punto suelto: el pedido recorriendo el servicio.
> El punto es la firma de la marca: aparece en el símbolo (tinta) y en la "i" del nombre (naranja).

Versión 1.0 · fuentes de generación en `brand/_src/` · hoja visual: `brand/manual.png`

---

## 1. Logotipo

| Pieza | Archivo | Uso |
| --- | --- | --- |
| **Logotipo principal (horizontal)** | `svg/savori-horizontal.svg` | Cabeceras, login, documentos, firma de mail |
| Vertical | `svg/savori-vertical.svg` | Portadas, carteles, espacios cuadrados |
| **Isotipo (símbolo)** | `svg/savori-symbol.svg` | Avatares, sellos, espacios chicos con fondo liso |
| Wordmark | `svg/savori-wordmark.svg` | Cuando el símbolo ya está presente al lado |
| Icono de app | `web/app-icon.svg` (+ PNG) | iOS / Android / PWA |
| Favicon | `web/favicon.svg`, `web/favicon.ico` | Pestaña del navegador |

### Variantes de color (todas existen para símbolo, horizontal, vertical y wordmark)

| Sufijo | Cuándo |
| --- | --- |
| *(sin sufijo)* | **Fondos claros** (blanco, crema, grises claros). S naranja, punto y nombre en tinta. |
| `-dark` | **Fondos oscuros** (carbón, negro). S naranja, punto y nombre en crema. |
| `-black` | Un solo color negro: sellos, fax, grabado, prensa. |
| `-white` | Un solo color blanco: sobre **naranja** de marca, fotos o fondos saturados. |
| `-orange` | Un solo color naranja: sobre fondos blancos/crema cuando solo hay una tinta. |

**Reglas de contraste (probadas):** la versión clara **no** va sobre fondo oscuro (el punto desaparece) ni sobre naranja
(la S desaparece). Usá `-dark` o `-white`.

### Espacio de seguridad y tamaños mínimos

- **Espacio de seguridad:** 1 × **X** alrededor del logo, donde **X = el diámetro del punto** del símbolo (≈ 1/6 de su altura).
- **Mínimos digitales:** horizontal 96 px de ancho · vertical 64 px de ancho · símbolo 16 px de alto (en tile naranja) o 24 px sobre fondo liso.
- **Mínimos impresos:** horizontal 25 mm · símbolo 6 mm.
- Por debajo de 24 px usar el **icono con tile naranja** (`web/`), no el símbolo suelto: su S es más gruesa y el punto más separado.

### Qué no hacer

No estirar ni rotar · no cambiar los colores del símbolo · no agregar sombras, degradés ni contornos · no recolorear la S
con el color del punto ni al revés · no separar el punto de la S · no reescribir el nombre con otra tipografía · no ponerlo
sobre fotos con mucho ruido (usar `-white` sobre una capa oscura).

---

## 2. Paleta

| Nombre | HEX | RGB | Rol | Contraste |
| --- | --- | --- | --- | --- |
| **Naranja Savori** | `#FF5B14` | 255 · 91 · 20 | Color de marca: logo, ilustración, acentos grandes | 5,8:1 sobre carbón · 6,1:1 sobre carbón profundo · **3,1:1 sobre blanco (solo gráficos y texto grande)** |
| **Naranja intenso** | `#CC4309` | 204 · 67 · 9 | **Acción en la interfaz**: botones, enlaces, foco | 4,8:1 con texto blanco (AA) |
| Naranja profundo | `#A83507` | 168 · 53 · 7 | Hover, texto naranja sobre claro | 6,6:1 sobre blanco |
| **Carbón** | `#1B1613` | 27 · 22 · 19 | Texto principal, nombre del logo | 17,9:1 sobre blanco |
| Carbón profundo | `#14110F` | 20 · 17 · 15 | Fondos oscuros | 6,1:1 con naranja de marca |
| **Crema** | `#FFF6EF` | 255 · 246 · 239 | Fondo cálido, nombre en versión oscura | 16,8:1 con carbón |
| Tinte | `#FFE6D9` | 255 · 230 · 217 | Fondos de acento suaves | — |
| Neutros | escala *stone* de Tailwind | | Interfaz (bordes, textos secundarios) | — |

**Proporción sugerida:** 60 % neutros/crema · 30 % carbón · 10 % naranja. El naranja es protagonista por su peso visual,
no por superficie: se usa en lo que importa (la marca, la acción principal).

**Tokens en la app** (`src/index.css`): `marca-50` crema · `marca-100` tinte · `marca-500` naranja Savori ·
`marca-600` naranja intenso · `marca-700` naranja profundo.

---

## 3. Tipografía

- **Nombre de la marca:** lettering propio (monolínea geométrico, trazo 18 sobre x-height 100, terminales redondeadas,
  punto de la "i" en naranja). **Es un dibujo, no una fuente**: no se reescribe, se usa siempre el SVG.
- **Interfaz y textos:** **Inter** (ya declarada en `src/index.css`). Pesos: 400 y 500 cuerpo, 600 etiquetas y botones,
  700 títulos. Títulos con tracking ligeramente cerrado (−0,01 em). Precios y cifras con `tabular-nums`.
- Jerarquía sugerida: H1 24–30 px/700 · H2 18–20 px/700 · cuerpo 14–16 px/400 · etiquetas 12–13 px/600 en mayúscula con
  tracking +0,06 em.
- Nota: Inter se carga hoy desde la fuente del sistema si no está instalada; para fijarla conviene autoalojarla
  (`@fontsource-variable/inter`).

---

## 4. Cómo se construyó (para quien lo modifique)

- Símbolo sobre grilla de 256: dos arcos circulares apilados de radio 44 y trazo 36, 270° cada uno; el inferior termina a 205° y el
  punto (Ø 36) se ubica a 270° del mismo círculo. Todo exacto, sin ajustes a mano.
- Wordmark: x-height 100, trazo 18; "s" con elipses (30 × 20,5) ajustadas con Béziers (error máx. 0,04); "a", "o", "r", "v", "i" con arcos y rectas exactas.
- Corte chico (`svg/savori-symbol-tile.svg`): trazo 42 y final del arco a 195° para que el punto no se pegue a la S a 16–32 px.
- Archivos: solo `<path>` y `<circle>` rellenos (sin trazos, texto, filtros ni rasters), lienzos de medidas enteras.
- Regenerar todo: `python brand/_src/gen_marca.py` (y `gen_manual.py` para la lámina).

## 5. Pendientes de criterio profesional

- **Registro de marca:** esta identidad no pasó por una búsqueda de anterioridades. Antes de invertir en cartelería, packaging
  o publicidad, conviene una búsqueda en INPI (Argentina) y, si aplica, en bases internacionales.
- Revisar con diseñador gráfico si se quiere un master en PDF/AI/EPS (los SVG sirven de master).

---
name: Savori
description: Gestión integral para restaurantes. Blanco que ordena, naranja que marca lo que está pasando ahora.
colors:
  fondo: "#f8f6f3"
  superficie: "#ffffff"
  superficie-2: "#f2eee9"
  borde: "#e8e2db"
  borde-fuerte: "#d6cec5"
  tinta: "#1b1613"
  tinta-2: "#5c534c"
  tinta-3: "#6b625a"
  marca-50: "#fff4ec"
  marca-100: "#ffe6d9"
  marca-200: "#ffc9ad"
  marca-300: "#ffa079"
  marca-500: "#ff5b14"
  marca-600: "#cc4309"
  marca-700: "#a83507"
  marca-800: "#7f2805"
  carbon: "#1b1613"
  carbon-2: "#2c2420"
  carbon-tinta-2: "#b8aea6"
  exito-50: "#e7f4ec"
  exito-300: "#7fd4a4"
  exito-500: "#2e9a5f"
  exito-600: "#1f7a4a"
  peligro-50: "#fdecea"
  peligro-300: "#ff9d94"
  peligro-500: "#d92d20"
  peligro-600: "#b42318"
typography:
  display:
    fontFamily: "Figtree, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "'tnum' 1"
  headline:
    fontFamily: "Figtree, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title-lg:
    fontFamily: "Figtree, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.375
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Figtree, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "'cv11' 1"
  control:
    fontFamily: "Figtree, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
  label:
    fontFamily: "Figtree, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
rounded:
  control: "10px"
  tarjeta: "14px"
  pastilla: "9999px"
spacing:
  control-x: "12px"
  tarjeta: "20px"
  modal: "24px"
  pagina-movil: "16px"
  pagina-tablet: "32px"
  pagina-escritorio: "40px"
  encabezado: "24px"
components:
  boton-primario:
    backgroundColor: "{colors.marca-600}"
    textColor: "{colors.superficie}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  boton-primario-hover:
    backgroundColor: "{colors.marca-700}"
  boton-primario-active:
    backgroundColor: "{colors.marca-800}"
  boton-secundario:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  boton-secundario-hover:
    backgroundColor: "{colors.superficie-2}"
  boton-fantasma:
    textColor: "{colors.tinta-2}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  boton-fantasma-hover:
    backgroundColor: "{colors.superficie-2}"
    textColor: "{colors.tinta}"
  boton-peligro:
    backgroundColor: "{colors.peligro-600}"
    textColor: "{colors.superficie}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  boton-peligro-hover:
    backgroundColor: "{colors.peligro-500}"
  boton-sm:
    padding: "0 12px"
    height: "40px"
  boton-lg:
    padding: "0 20px"
    height: "48px"
  boton-icono:
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.control}"
    size: "40px"
  campo:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  tarjeta:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.tarjeta}"
    padding: "20px"
  tarjeta-destacada:
    backgroundColor: "{colors.carbon}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.tarjeta}"
    padding: "20px"
  nav-item:
    textColor: "{colors.tinta-2}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  nav-item-activo:
    backgroundColor: "{colors.marca-600}"
    textColor: "{colors.superficie}"
  pestana:
    textColor: "{colors.tinta-2}"
    typography: "{typography.control}"
    padding: "0 14px"
    height: "40px"
  pestana-activa:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
  insignia-marca:
    backgroundColor: "{colors.marca-50}"
    textColor: "{colors.marca-700}"
    typography: "{typography.label}"
    rounded: "{rounded.pastilla}"
    padding: "4px 10px"
  insignia-neutra:
    backgroundColor: "{colors.superficie-2}"
    textColor: "{colors.tinta-2}"
    typography: "{typography.label}"
    rounded: "{rounded.pastilla}"
    padding: "4px 10px"
  punto:
    backgroundColor: "{colors.marca-500}"
    rounded: "{rounded.pastilla}"
    size: "8px"
  cantidad-pastilla:
    backgroundColor: "{colors.marca-600}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.pastilla}"
    height: "44px"
---

# Design System: Savori

## Overview

**Creative North Star: "El pase de la cocina"**

Savori es el pase de un restaurante en pleno servicio: una superficie limpia donde todo está en su lugar y lo único que llama la atención es lo que hay que despachar ya. El blanco cálido ordena; el naranja Savori marca lo que está pasando ahora (una mesa ocupada, un pedido nuevo, la sección en la que estás, una operación por enviar). Si algo es naranja, alguien tiene que mirarlo o tocarlo.

El sistema es denso pero sereno: una sola familia tipográfica (Figtree) en pesos semibold y bold, cifras siempre tabulares, bordes finos cálidos en lugar de sombras y radios moderados (10 px controles, 14 px tarjetas). La profundidad se reserva para lo que flota. Los iconos son Lucide con un único trazo de 1.75 y animaciones sutiles que se disparan desde el control que los contiene, nunca en bucle. El mismo lenguaje sirve al dueño en la PC, al mozo en el celular, a la cocina en una TV y al cliente en la carta QR.

Rechazos confirmados: el dashboard genérico de grises con un acento, el panel oscuro con neón, los degradados y el abuso de sombras. Ningún color compite con el naranja.

**Key Characteristics:**
- Fondo blanco cálido, superficies blancas, bordes cálidos finos.
- Naranja con significado: vivo / ahora, acción principal, navegación activa. Nunca decoración.
- El punto de Savori como lenguaje de estado en toda la app.
- Figtree autoalojada, cifras tabulares en dinero, cantidades y horas.
- Plano por defecto; sombra solo en capas flotantes.
- Objetivos táctiles de 40 px mínimo en la gestión y 44 px en la carta pública.
- Movimiento corto, con salida suave, que cae a opacidad con movimiento reducido.

## Colors

Una paleta de blancos cálidos y tinta carbón con un único acento: el naranja Savori, escalonado por función.

### Primary
- **Naranja Savori** (marca-500): la marca, los gráficos y el punto de Savori. No se usa para texto ni como fondo de botón (no alcanza AA con blanco).
- **Naranja de acción** (marca-600): botón primario, ítem activo de la navegación, contador de la pestaña activa, interruptor encendido, anillo de foco y caret. Alcanza AA con texto blanco.
- **Naranja tinta** (marca-700 / marca-800): texto naranja sobre blanco o sobre marca-50; hover y pulsado del botón primario.
- **Naranja suave** (marca-50 / marca-100): fondo de insignias "marca", de la mesa ocupada en el mapa y de la selección de texto.

### Secondary
- **Carbón** (carbon / carbon-2): la tarjeta destacada (ganancia del período) y los tooltips del gráfico. Es de la marca, no un segundo acento: un panel por pantalla como máximo. Su texto secundario es carbon-tinta-2.

### Tertiary
- **Verde servicio** (exito-50 / 500 / 600): solo para lo resuelto o positivo: "En línea", pedido listo, variación al alza, aviso de éxito.
- **Rojo alarma** (peligro-50 / 500 / 600): solo para errores, sin conexión, acciones destructivas, variación a la baja y demoras críticas de cocina.
- Sobre carbón, las variaciones usan exito-300 y peligro-300 para mantener el contraste.

### Neutral
- **Blanco cálido** (fondo): fondo de la app.
- **Blanco** (superficie): tarjetas, barra lateral, campos, diálogos, carta pública.
- **Blanco hueso** (superficie-2): hover, controles segmentados, placeholders de imagen, círculo de icono en estados vacíos.
- **Borde cálido** (borde): separadores y bordes de tarjeta. **Borde firme** (borde-fuerte): bordes de campos, botón secundario y estados vacíos punteados.
- **Tinta** (tinta, 15,5–17,9:1), **tinta secundaria** (tinta-2, 6,5–7,5:1), **tinta terciaria** (tinta-3, 5,2–6:1): todas AA sobre fondo, superficie y superficie-2.

### Named Rules
**The Naranja Significa Ahora Rule.** El naranja se usa solo para lo que está vivo o pasando ahora, para la acción principal y para la navegación activa. Estados vacíos, avatares, iconos decorativos y encabezados no llevan naranja.

**The Alerta No Es Error Rule.** Las alertas de stock (bajo o agotado) son marca, no peligro: piden atención, no indican una falla. El rojo queda para errores, destrucción y pérdidas.

**The Variación Por Dirección Rule.** Las variaciones de un número se colorean por dirección: exito al alza, peligro a la baja; sobre carbón, sus tonos -300. Sin datos previos, tinta-3 (o carbon-tinta-2) y el texto "Sin datos previos".

**The Sin Degradados Rule.** Ningún degradado, en ninguna superficie, botón o gráfico. Los colores son planos.

## Typography

**Display Font:** Figtree (con ui-sans-serif, system-ui, -apple-system, Segoe UI)
**Body Font:** Figtree
**Label/Mono Font:** Figtree con cifras tabulares

**Character:** Una geométrica amable y legible a distancia, autoalojada como fuente variable (300–900) con `cv11` activo. La jerarquía se construye con peso (semibold 600 para controles y etiquetas, bold 700 para títulos y cifras) y con tracking negativo en los tamaños grandes, no con más familias.

### Hierarchy
- **Display** (700, 2.75rem, 1, -0.03em, tabular): la cifra protagonista de una pantalla (ganancia del período en la tarjeta carbón). Una por pantalla.
- **Headline** (700, 1.75rem, 1.25, -0.02em): título de cada pantalla en el encabezado de página, login y carta pública; también las cifras de las tarjetas de métricas.
- **Title large** (700, 1.125rem, 1.375, -0.01em): título de diálogos.
- **Title** (700, 1rem): título de tarjetas y de estados vacíos; nombre de producto en la carta (600).
- **Body** (400, 0.875rem, 1.625): descripciones y texto de apoyo, a 65ch como máximo en encabezados y 46ch en estados vacíos. Los campos usan 1rem para evitar el zoom en iOS.
- **Control** (600, 0.875rem): botones, navegación, pestañas, etiquetas de campo.
- **Label** (600, 0.75rem, 1): insignias, contadores, rótulos de grupo de la navegación ("Servicio", "Gestión"), estado de conexión, ayudas de campo (400).

Los números de mesa en comandas suben a 1.25rem / 1.875rem en bold tabular para leerse a distancia; el QR impreso usa 3rem.

### Named Rules
**The Cifras Tabulares Rule.** Todo dinero, cantidad, hora, contador y número de mesa lleva cifras tabulares. Ninguna cifra se alinea con figuras proporcionales.

**The Sin Mayúsculas Rule.** Los rótulos van en tipo de oración. La única excepción es un código de invitación, que se espacia (0.18em) para dictarlo.

## Layout

Shell de gestión: barra lateral blanca fija de 248 px a la izquierda desde 768 px (logo, tarjeta del restaurante, navegación agrupada Servicio / Gestión, estado de conexión y salida al pie), separada por un borde; en celular, barra superior de 56 px con menú, símbolo, sección actual y estado de conexión, y la navegación se abre en un diálogo.

El contenido vive en un único contenedor anclado a la izquierda, con relleno de 16 px en celular, 32 px en tablet y 40 px en escritorio (24 / 32 px arriba, 48 px abajo). Las pantallas de gestión limitan su ancho (72rem para Mesas, Pedidos, Carta y Ganancias; 64rem para Stock) sin centrarse. El encabezado de página separa 24 px de la tarea principal.

La carta pública es otra cosa: columna centrada de 42rem sobre blanco, carril horizontal de categorías fijo arriba y barra inferior fija con el total y el botón de pedido, respetando el área segura.

El ritmo usa la escala de 4 px: 6 px entre etiqueta y campo, 8 px entre acciones, 12 px entre ícono y texto en la navegación, 20 px de relleno de tarjeta, 24 px de relleno de diálogo.

### Named Rules
**The Un Solo Contenedor Rule.** Las pantallas de gestión tienen un único contenedor anclado a la izquierda. No se centran con márgenes automáticos.

**The Objetivo Táctil Rule.** Ningún control de la gestión mide menos de 40 px de alto; en la carta pública, 44 px. Las pestañas miden 40 px.

## Elevation & Depth

Savori es plano por defecto. La jerarquía de superficies se expresa con color (fondo, superficie, superficie-2, carbón) y con bordes cálidos de 1 px. La sombra aparece solo en lo que flota sobre la página: diálogos, tooltips y la mesa mientras se arrastra en el editor. Los controles elevados (botón secundario, campos, pestaña activa, perilla del interruptor) llevan una sombra de un píxel que solo asienta el borde.

### Shadow Vocabulary
- **Flotante** (`box-shadow: 0 18px 40px -16px rgb(27 22 19 / 0.28), 0 2px 8px -2px rgb(27 22 19 / 0.08)`): diálogos, tooltips del gráfico y elementos arrastrados.
- **Control** (`box-shadow: 0 1px 2px rgb(27 22 19 / 0.06)`): asiento de campos, botón secundario, pestaña activa y perilla del interruptor.

El fondo de los diálogos es tinta al 42 %, que entra en 220 ms.

### Named Rules
**The Bordes Antes Que Sombras Rule.** Las tarjetas, la barra lateral y los paneles se separan con bordes, nunca con sombra. Si no flota, no tiene sombra flotante.

## Shapes

Dos radios y una pastilla. Los controles (botones, campos, ítems de navegación, avisos, botones de icono) usan esquinas suaves de 10 px; las tarjetas, diálogos, estados vacíos e imágenes de producto, 14 px. Lo que es un estado o una cantidad es una pastilla completa: insignias, contadores, el punto de Savori, el interruptor, el control de cantidad de la carta pública y los chips de categoría.

Los estados vacíos usan borde punteado firme para decir "acá va algo". Las tarjetas nunca se anidan.

## Components

### Buttons
Directos y firmes: semibold, sin mayúsculas, con icono animado a la izquierda cuando ayuda.
- **Shape:** esquinas suaves (10 px).
- **Primary:** naranja de acción con texto blanco; hover marca-700, pulsado marca-800. Una acción primaria por zona.
- **Sizes:** sm 40 px (relleno 12 px, icono 16), md 44 px (16 px, icono 18), lg 48 px (20 px, icono 20, texto 1rem).
- **Hover / Focus:** transición de color de 150 ms; al pulsar escala a 0.98; anillo de foco de 2 px marca-600 con 2 px de separación. Con `cargando`, el icono se reemplaza por un spinner y el botón queda deshabilitado.
- **Secondary:** superficie blanca, borde firme, sombra de control; hover superficie-2.
- **Ghost (fantasma):** sin fondo, tinta-2; hover superficie-2 y tinta.
- **Danger (peligro):** peligro-600 con texto blanco, solo para confirmar acciones destructivas.
- **Botón de icono:** 40 × 40 px, icono 18, etiqueta accesible obligatoria; tono peligro con hover peligro-50.
- **Enlaces como botón:** usan el mismo estilo de botón para la navegación.

### Chips
- **Insignia:** pastilla de 0.75rem semibold con relleno 4 × 10 px en cinco tonos: neutro, marca, exito, peligro, carbón. Con `punto`, lleva el punto de Savori delante.
- **Chips de categoría (carta pública):** pastilla de 44 px con borde cálido y tinta-2; hover borde firme.

### Cards / Containers
- **Corner Style:** 14 px.
- **Background:** superficie blanca; la tarjeta destacada es carbón con texto blanco.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** 1 px borde cálido.
- **Internal Padding:** 20 px; con encabezado, el título (1rem bold) y su descripción van arriba y las acciones a la derecha; las listas que llegan al borde separan el encabezado con un borde.
- **Estado vacío:** 14 px, borde punteado firme, centrado, círculo de 48 px en superficie-2 con icono tinta-2, título, una línea y la acción a mano. Nunca naranja.

### Inputs / Fields
- **Style:** 44 px de alto, superficie blanca, borde firme, 10 px, sombra de control, texto 1rem; etiqueta semibold 0.875rem encima a 6 px; ayuda en 0.75rem tinta-3 debajo.
- **Focus:** borde marca-600 y halo de 4 px marca-600 al 15 %; hover lleva el borde a tinta-3.
- **Error / Disabled:** con `aria-invalid`, borde peligro-600; deshabilitado en superficie-2 con tinta-3.
- **Selector:** select nativo con chevron tinta-3 a la derecha. **Casilla:** checkbox nativo de 18 px con acento marca-600. **Interruptor:** pista de 40 × 24 px (borde-fuerte apagado, marca-600 encendido) con perilla blanca que se desliza en 200 ms con la curva de salida.

### Navigation
- **Barra lateral:** ítems de 40 px, 0.875rem semibold, icono animado de 18 px a 12 px del texto, tinta-2; hover superficie-2 y tinta; **activo: píldora marca-600 con texto blanco**. Rótulos de grupo en 0.75rem semibold tinta-3.
- **Contador de alertas de stock:** pastilla marca-600 con texto blanco; sobre el ítem activo se invierte a superficie con marca-700. En celular, un punto marca sobre el botón de menú.
- **Pie:** estado de conexión con el punto de Savori (exito "En línea", marca latiendo "Sincronizando…" / "n por enviar", peligro "Sin conexión" / "n sin enviar").
- **Pestañas:** control segmentado sobre superficie-2 con pestañas de 40 px; la activa es blanca con sombra de control y su contador marca-600. Teclado WAI-ARIA (flechas, Inicio, Fin).

### Dialogs
Diálogo nativo con foco atrapado, Esc y clic afuera para cerrar: superficie blanca, 14 px, borde cálido, sombra flotante, relleno 24 px, título 1.125rem bold, botón de cerrar de icono. Entra desde 10 px abajo y escala 0.985 en 260 ms. **Confirmar** reemplaza a `window.confirm`: título, la consecuencia concreta, cancelar (secundario, con foco inicial) y un botón con el nombre de la acción (primario o peligro).

### Avisos
Mensaje dentro de la página: 10 px, borde del tono al 25 %, fondo -50, icono de 18 px; error en peligro, éxito en exito, información en marca-800 sobre marca-50.

### Control de cantidad
- **Pastilla (carta pública):** en cero, "Agregar" con borde marca-600 y texto marca-700; con unidades, pastilla marca-600 de 44 px con − n + blancos.
- **Bordes (carga del mozo):** botones de 40 px con borde firme; la cantidad en marca-700 cuando es mayor que cero.

### El punto de Savori (componente de firma)
Un círculo de 8 px que es el lenguaje de estado del sistema: naranja marca-500 significa que algo está pasando ahora (mesa ocupada, pedido nuevo, columna de pendientes en cocina, mesa del cliente en la carta, sincronización en curso). Sus otros tonos son exito, peligro, neutro y carbón. En modo `vivo` late tres veces (escala 1.18, 1.6 s) y se detiene; nunca un movimiento infinito. En el mapa de mesas, el indicador de pedidos listos usa exito-600 latiendo.

### Iconos
Lucide Animated (MIT) con alias en español (`IconoMesas`, `IconoCobrar`…) y Lucide estático, con un único trazo de 1.75. Se animan cuando el usuario pasa, enfoca o toca el control que los contiene, mediante `useIconoAnimado`; el movimiento reducido lo resuelve `MotionConfig reducedMotion="user"` en la raíz.

### Movimiento
Curva de salida `cubic-bezier(0.16, 1, 0.3, 1)` para todo lo que entra. Entrada de contenido: 320 ms desde 6 px abajo. Cambios de color en controles: 150 ms. Con movimiento reducido, las entradas y los diálogos conservan solo la opacidad y el latido pasa a un cambio de opacidad (0.6).

## Do's and Don'ts

### Do:
- **Do** reservar el naranja para lo que está vivo o pasando ahora, para la acción primaria (marca-600) y para el ítem activo de la navegación.
- **Do** marcar el estado con el punto de Savori, y hacerlo latir (tres veces) solo cuando algo acaba de pasar.
- **Do** separar superficies con bordes de 1 px (borde, borde-fuerte) y dejar la sombra flotante solo para diálogos, tooltips y elementos arrastrados.
- **Do** usar cifras tabulares en todo dinero, cantidad, hora y número de mesa.
- **Do** colorear las variaciones por dirección: exito al alza, peligro a la baja, y sus tonos -300 sobre carbón.
- **Do** mantener objetivos táctiles de 40 px en la gestión y 44 px en la carta pública; pestañas de 40 px.
- **Do** usar un único contenedor anclado a la izquierda en las pantallas de gestión.
- **Do** confirmar acciones con `useConfirmar`, nombrando la consecuencia y la acción en el botón.
- **Do** dejar que el movimiento reducido caiga a opacidad y envolver la app en `MotionConfig reducedMotion="user"`.

### Don't:
- **Don't** usar degradados en ninguna superficie, botón o gráfico.
- **Don't** pintar de naranja estados vacíos, avatares, iconos decorativos ni contadores que no sean de alertas o de la pestaña activa.
- **Don't** usar peligro para las alertas de stock: son marca.
- **Don't** usar marca-500 para texto ni como fondo de botón con texto blanco; para eso está marca-600.
- **Don't** poner sombra en tarjetas, paneles o la barra lateral, ni anidar tarjetas.
- **Don't** centrar las pantallas de gestión con márgenes automáticos.
- **Don't** usar `window.confirm` ni diálogos del sistema.
- **Don't** animar en bucle infinito ni desplazar elementos cuando el usuario pidió movimiento reducido.
- **Don't** introducir un segundo acento que compita con el naranja.

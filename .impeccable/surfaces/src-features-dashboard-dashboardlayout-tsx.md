---
version: 1
slug: "src-features-dashboard-dashboardlayout-tsx"
primary_target: "src/features/dashboard/DashboardLayout.tsx"
related_targets: ["src/features/ganancias/GananciasPage.tsx","src/features/carta-publica/CartaPublicaPage.tsx"]
---

# Superficie: dashboard de Savori (todas las pantallas internas + carta pública)

**Modo:** Operate. Construcción code-led (no hay generación de imágenes).

**Audiencia y tarea:** dueño en PC (carta, stock, equipo, ganancias), mozo en celular (mapa, pedidos, cobro), cocina en tablet/TV (comandas). El cliente pide desde la carta QR.

**Restricciones del usuario:** naranja y blanco; sin degradados; sombras mínimas; nada que compita con el naranja; minimalista moderno; iconos con animación sutil y respeto por movimiento reducido; no cambiar lógica, consultas, permisos ni base de datos. Referencia: captura de Stitch (Ganancias) — fijada por el usuario: "es este pero si podes mejorarlo".

## Direction contract

THESIS: La operación de un restaurante leída de un vistazo: blanco que ordena, naranja que marca lo que está pasando ahora. Rechaza el dashboard genérico de grises con un acento y el panel oscuro con neón.

OWN-WORLD: Fondo blanco cálido (#F8F6F3), superficies blancas con bordes finos cálidos, texto carbón #1B1613. Naranja Savori #FF5B14 para la marca y gráficos, #CC4309 para acciones y el ítem activo. Figtree autoalojada, cifras tabulares. Iconos Lucide Animated + Lucide (un solo trazo, 1.75). Bordes en vez de sombras; radios 10/14 px. Gesto distintivo: el **punto de Savori** como lenguaje de estado: un punto naranja marca todo lo que está vivo (mesa ocupada, pedido nuevo, sección activa, conexión).

STORY: el usuario entiende qué requiere atención (lo naranja), confía en los números (tabulares, con variación) y actúa con un toque (acciones con icono y respuesta inmediata).

FIRST VIEWPORT: sidebar blanca de 248 px a la izquierda (logo, restaurante, navegación agrupada Servicio/Gestión con píldora naranja activa, estado de conexión al pie); a la derecha, encabezado con título, descripción breve y acciones; debajo, la tarea principal de la pantalla. En Ganancias: tarjeta de ganancia destacada en carbón + 5 métricas con variación vs. período anterior, luego el gráfico de barras con tooltip.

FORM: shell estándar de SaaS (posición 1 de la lista ordenada; dirección fijada por el usuario). seed: none (pinned) — "es este pero si podes mejorarlo"; "identidad visual basada principalmente en NARANJA Y BLANCO"; "sistema minimalista moderno, los iconos con animaciones".

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

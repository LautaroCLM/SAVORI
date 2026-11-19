# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(La misma web se empaqueta como app de escritorio con Tauri v2 / WebView2; su lenguaje de diseño es web, no nativo.)

## Users

- **Dueño / administrador** del restaurante: arma la carta, las mesas y el stock, gestiona al equipo y mira las ganancias. Usa principalmente **PC o notebook** (en la caja o en la oficina).
- **Mozo**: toma y entrega pedidos, abre y cierra cuentas desde el mapa de mesas. Usa principalmente el **celular**, en movimiento, con una mano y con apuro.
- **Cocina**: ve entrar los pedidos y los pasa a "en preparación" y "listo". Usa una **tablet o TV** fija, mirada a distancia, a veces con las manos ocupadas.
- **Cliente del restaurante** (sin cuenta): escanea el QR de su mesa, ve la carta y pide desde su propio celular.

Segmento: de todo un poco (restaurantes y bodegones de barrio, cafeterías, parrillas, etc.); no hay un segmento dominante todavía.

## Product Purpose

Sistema de gestión integral para restaurantes que se vende por cuenta: centraliza carta digital por QR, pedidos en tiempo real, mapa de mesas, cocina, cobro, stock y ganancias. El éxito es que un restaurante opere todo su servicio diario desde Savori sin fricción y que el dueño entienda sus números de un vistazo.

## Positioning

**Diseño y claridad.** Frente a sistemas de gestión gastronómica tradicionales (Fudo, MaxiRest y similares), Savori se distingue por verse profesional y por mostrar el estado del servicio y los números del negocio con claridad, sin pantallas sobrecargadas.

## Operating Context

- Servicio en vivo: pedidos que entran por QR o por el mozo, cocina que los avanza, mozo que entrega y cobra. Todo se sincroniza en tiempo real.
- Puede caerse internet en pleno servicio: hay modo offline con cola de operaciones y aviso "SIN CONEXIÓN".
- Impresión de los QR de cada mesa para pegarlos en las mesas.
- Idioma: español de Argentina; moneda: pesos (ARS).

## Capabilities and Constraints

- Roles: admin, mozo, cocina (permisos aplicados en la base de datos). El cliente no inicia sesión.
- Altas de cuentas: solo el dueño del sistema crea usuarios; el usuario crea su restaurante o se une con un código de invitación.
- No hay planes, pruebas gratuitas ni avisos de pago dentro de la app.
- Stack: React + Vite + TypeScript + Tailwind, Supabase (Postgres, Auth, Realtime, RLS). Sin SSR.
- Imágenes de productos en Cloudflare R2: subida firmada por la función `firmar-imagen` (falta cargar las credenciales de R2 en producción).

## Brand Commitments

- Nombre: **Savori**. Identidad de marca existente en `brand/` (logo "Ruta": S de un solo trazo con punto; manual en `brand/BRAND.md`).
- **El naranja es el color principal de la marca** y la interfaz es **naranja y blanca** (pedido explícito). El usuario aceptó prescindir del azul oscuro de la referencia.
- Pedidos explícitos para la interfaz: **sin degradados**, sin abuso de sombras, sin colores que compitan con el naranja, estética minimalista y moderna, **iconos con animaciones sutiles** que respeten el movimiento reducido.
- Referencia visual aportada por el usuario: captura de Stitch de la pantalla de Ganancias (sidebar compacta con indicador naranja, tarjetas de métricas, gráfico de barras). Es punto de partida, no un diseño a copiar.

## Evidence on Hand

- Datos reales de demo en la base local (seed + historial de pedidos); no hay clientes, testimonios ni métricas públicas: no inventarlos.

## Product Principles

1. **El servicio no se frena**: lo que usan mozos y cocina en vivo prioriza velocidad, lectura a distancia y objetivos táctiles generosos sobre cualquier adorno.
2. **Claridad antes que cantidad**: cada pantalla muestra primero lo que hay que hacer o saber ahora; lo demás espera un clic.
3. **Los números se entienden de un vistazo**: dinero y estados se leen sin interpretar colores ambiguos.
4. **Una sola identidad**: naranja y blanco aplicados con criterio, consistentes en todas las secciones.

## Accessibility & Inclusion

WCAG 2.2 AA como piso (contraste, foco visible, teclado, objetivos táctiles). Respetar `prefers-reduced-motion`. Uso a distancia en cocina y en movimiento en salón.

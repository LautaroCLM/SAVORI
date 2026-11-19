# Sistema de gestión para restaurantes

Multi-restaurante (multi-tenant) sobre **Supabase**, con frontend **React + Vite + TypeScript + Tailwind**.
Interfaz en español (Argentina), moneda ARS.

> **Estado:** Fases 1 a 5 listas: auth y onboarding, carta, mesas con mapa, pedidos por QR y de mozo, cocina, cobro, stock, ganancias, **modo offline con cola de operaciones** y **app de escritorio (Tauri v2)**. Falta solo la subida de imágenes a Cloudflare R2 (Fase 2) y, opcionalmente, empaquetar para móvil (Android/iOS).

---

## Requisitos

- Node.js 20 o superior
- Docker Desktop (solo para la base **local** y los tests)
- Una cuenta de Supabase (para producción)

```powershell
npm install
```

---

## 1. Desarrollo local (recomendado para empezar)

```powershell
npx supabase start          # levanta Postgres/Auth/Realtime en Docker (la primera vez tarda)
npx supabase db reset       # aplica migraciones + seed.sql
npx supabase status         # muestra la URL y las claves locales
```

Copiá `.env.example` a `.env.local` y completá con los valores de `supabase status`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<ANON_KEY de supabase status>
```

```powershell
npm run dev                 # http://localhost:5173
```

### Datos de prueba (seed)

| Usuario            | Rol    | Contraseña |
| ------------------ | ------ | ---------- |
| `admin@demo.test`  | admin  | `demo1234` |
| `mozo@demo.test`   | mozo   | `demo1234` |
| `cocina@demo.test` | cocina | `demo1234` |

Carta pública: <http://localhost:5173/m/demo-mesa-1-token> (hasta `demo-mesa-6-token`).

> El seed **solo se ejecuta localmente** con `db reset`. Nunca lo corras en producción.

### Tests de seguridad

```powershell
npx supabase test db
```

Corre `supabase/tests/aislamiento_test.sql` (pgTAP) y `onboarding_test.sql` (132 tests de base de datos) y 26 tests de la cola offline (`npm test`), que verifica entre otras cosas:

- un usuario del restaurante A **no ve ni modifica** datos del restaurante B (todas las tablas);
- `anon` **no puede leer ninguna tabla** directamente ni ejecutar funciones internas;
- FKs compuestas impiden referencias cruzadas entre restaurantes;
- permisos por rol (mozo no edita la carta ni mueve mesas, cocina solo cambia el estado del pedido);
- `obtener_carta` no expone `costo`; `crear_pedido_qr` usa precios de la base, abre sesión, marca la mesa ocupada y aplica el anti-spam;
- un restaurante suspendido (`activo = false`) queda bloqueado, incluida su carta QR.

---

## 2. Producción (proyecto Supabase en la nube)

1. Crear un proyecto en <https://supabase.com/dashboard> (región sugerida: São Paulo).
2. **Authentication → Sign In / Providers → Email**: desactivar *Allow new users to sign up*
   (los usuarios los creás vos con el script). Podés desactivar también *Confirm email*: el script ya crea los usuarios confirmados.
3. **Authentication → URL Configuration → Site URL**: la URL donde publiques el frontend.
4. Vincular y aplicar migraciones:

   ```powershell
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>
   npx supabase db push
   ```

5. Frontend: en `.env.local` (o en las variables del hosting) poner la URL y la **anon key** del proyecto
   (*Project Settings → API*).
6. Scripts de administración: crear `.env.scripts` con la URL y la **service role key**
   (ver `.env.example`). Este archivo está en `.gitignore`. **Nunca** subas la service role key ni la pongas en variables `VITE_*`.

Para el hosting del frontend sirve cualquier hosting estático (Cloudflare Pages, Netlify, Vercel). Configurá un
*fallback* de SPA (todas las rutas → `index.html`) para que funcionen los links `/m/:token`.

---

## 3. Usuarios, restaurantes y equipo

**Solo vos creás cuentas** (el registro público está cerrado). Desde tu PC (usan `.env.scripts`):

```powershell
# Crear un usuario de acceso (el caso normal). Si no pasás --password se genera una y se muestra.
npm run crear-usuario -- --email juan@laparrilla.com
```

En su **primer ingreso** esa persona ve una pantalla de bienvenida y elige:

- **Crear mi restaurante** → queda como `admin` de un restaurante nuevo; o
- **Tengo un código** → se une a un restaurante existente con el rol de la invitación.

**Equipo (admin):** en el módulo *Equipo* el admin genera códigos de invitación (`XXXX-XXXX`) para mozo, cocina u otro admin.
Cada código sirve una sola vez, vence a los 7 días y se puede revocar. También cambia roles y desactiva usuarios.
Quien se une con un código necesita igualmente un usuario creado por vos (`crear-usuario`).

Alternativas por script:

```powershell
# Restaurante + admin de una vez
npm run crear-restaurante -- --nombre "La Parrilla de Juan" --email juan@laparrilla.com --admin-nombre "Juan Pérez"

# Usuario directo dentro de un restaurante existente
npm run crear-usuario -- --email pedro@laparrilla.com --restaurante la-parrilla-de-juan --nombre "Pedro" --rol mozo
```

### Entornos (local vs producción)

| Archivo | Para qué | Apunta a |
| --- | --- | --- |
| `.env.local` | frontend (`npm run build`, hosting) | **producción** |
| `.env.development.local` | `npm run dev` (tiene prioridad en desarrollo) | Supabase **local** |
| `.env.scripts` | scripts de administración | **producción** |
| `.env.scripts.localdev` | copia con la service role local | local |

Para correr un script contra la base local: `$env:SUPABASE_URL="http://127.0.0.1:54321"; $env:SUPABASE_SERVICE_ROLE_KEY="<clave local>"` antes del comando (las variables de entorno ganan al archivo).

**Suspender una cuenta:** en el SQL Editor de Supabase:

```sql
update restaurantes set activo = false where slug = 'la-parrilla-de-juan';
```

Con `activo = false` sus usuarios ven "Cuenta suspendida", la RLS les bloquea todos los datos y sus QR dejan de responder.

---

## Identidad visual

Marca **Savori** (concepto *Ruta*). Todo el kit está en [`brand/`](brand/):

- `brand/BRAND.md`: mini manual (uso, paleta, tipografía, espacio de seguridad, qué no hacer) · `brand/manual.png`: lámina visual.
- `brand/svg/`: logotipo horizontal y vertical, isotipo y wordmark en versiones clara, oscura (`-dark`), negra, blanca y naranja.
- `brand/web/`: favicon, icono de app y set PWA (se copian a `public/`).
- `src/components/Logo.tsx`: único punto de uso en la app (importa los SVG de `brand/svg/`).
- `python brand/_src/gen_marca.py` regenera todos los SVG; `gen_manual.py` regenera la lámina.

La paleta vive como tokens `marca-*` en `src/index.css` (`marca-600` = naranja de acción, AA con texto blanco).

---

## Cómo se usa en el día a día

1. **Admin** arma la **Carta** (categorías y productos) y los **salones y mesas**; en *Mesas → Editar mapa* acomoda las mesas arrastrándolas. Imprime los QR desde *Mesas → Imprimir todos los QR*.
2. El **cliente** escanea el QR de su mesa, ve la carta y **pide desde el celular** (sin registrarse). Los precios los toma siempre el servidor.
3. El pedido aparece **al instante** (con aviso sonoro) en **Cocina** y en **Pedidos**. Cocina pasa cada pedido a *En preparación* y *Listo*.
4. El **mozo** ve el ✓ verde en la mesa del mapa, marca *Entregado*, puede **cargar pedidos** propios (*+ Nuevo pedido*) y **cierra la cuenta** con el medio de pago; la mesa vuelve a *Libre*.

**Stock** (solo en productos con *Controlar stock* activado, desde *Stock → Configurar*): cada venta **descuenta** unidades en forma atómica (si dos mesas piden la última, una recibe "sin stock"), un producto agotado **desaparece de la carta** de los clientes, **cancelar** un pedido devuelve el stock, y todo queda en *Stock → Movimientos*. El admin registra entradas (compras), salidas (mermas) y conteos físicos. El menú muestra un aviso rojo con la cantidad de productos agotados o bajo el mínimo.

**Ganancias** (admin): *Ganancias → período* (hoy, 7/30 días, este mes, mes pasado o personalizado) muestra ganancia, ingresos, costos, margen, ticket promedio, evolución por día/semana/mes, productos más vendidos y cobros por medio de pago. Cuenta solo pedidos **entregados**: (precio − costo) × cantidad con los valores del momento de la venta (editar un producto no altera el historial).

Todo se sincroniza con **Supabase Realtime** (`pedidos`, `pedido_items`, `mesas`, `sesiones_mesa`, filtrado por restaurante). Si se corta la conexión se muestra *SIN CONEXIÓN* y, al volver, se resincroniza solo.

---

## Modo offline

Pensado para cuando se cae el internet **en pleno servicio** (con la app ya abierta). Supabase sigue siendo la única fuente de verdad: la app solo guarda lo que hiciste sin conexión y lo reenvía, en orden, al volver.

- **Aviso SIN CONEXIÓN** permanente en el dashboard, y bajo él una franja con las operaciones pendientes ("3 operaciones pendientes · se envían solas cuando vuelva la conexión").
- **Qué funciona sin conexión:** cambiar el estado de un pedido (cocina, mozo), **cargar pedidos del mozo**, **cerrar cuentas** y marcar mesas libres/ocupadas. Se ven al instante en pantalla y quedan en una **cola local** (por usuario, en este dispositivo).
- **Qué se ve sin conexión:** lo último sincronizado (pedidos, mesas, carta, stock…), guardado en una caché local que se borra al cerrar sesión o cambiar de usuario.
- **Al volver internet** (o cada 15 s mientras haya pendientes) la cola se envía **en orden y de a una**. Un corte de red no descarta nada; si el **servidor rechaza** una operación (por ejemplo, el pedido se canceló mientras tanto o no hay stock) queda marcada en rojo con el motivo, para **reintentar o descartar**.
- **Sin duplicados:** los pedidos del mozo llevan un ID generado en el dispositivo; si el servidor recibió el pedido pero la respuesta se perdió, el reintento devuelve el mismo pedido (`crear_pedido_mozo` es idempotente).
- **Qué requiere conexión:** administrar la carta, el stock, las mesas (alta/edición), el equipo y ver ganancias; y los pedidos que hacen los **clientes** por QR.
- **Limitación conocida:** abrir la app **en frío** sin internet y con la sesión vencida (más de ~1 h desde la última conexión) no puede verificar la sesión: muestra un aviso con *Reintentar*. Lo habitual (perder la conexión con la app abierta) funciona.
- Para el desarrollador: la cola es lógica pura y testeada (`src/lib/offline/cola.ts`, `npm test`); los servicios envían con `ejecutarOEncolar` (`src/services/offline.ts`) y los componentes no cambian.

---

## App de escritorio (Tauri v2)

La misma web, empaquetada como app nativa (WebView2 en Windows), en `src-tauri/`. Requiere [Rust](https://rustup.rs) y, en Windows, las *Build Tools de Visual Studio* con "Desarrollo de escritorio con C++" (y WebView2, que ya viene con Windows 10/11).

```powershell
npm run tauri:dev      # ventana de desarrollo (usa la base local si tenés Supabase local corriendo)
npm run tauri:build    # genera el instalador en src-tauri/target/release/bundle/nsis/
```

- El build de escritorio usa `.env.tauri`: ahí está `VITE_PUBLIC_URL`, la URL pública de la web que se codifica en los **QR** (el origen interno de la app no sirve para eso). Cambiala si publicás la web en otro dominio.
- Seguridad: la app solo puede conectarse a Supabase (política CSP en `src-tauri/tauri.conf.json`) y no expone acceso a archivos ni al sistema.
- El identificador es `app.savori.gestion` y los iconos salen de `brand/web/icon-1024.png` (`npx tauri icon brand/web/icon-1024.png` para regenerarlos).
- **Móvil (Android/iOS):** la estructura es compatible con Tauri Mobile (`npx tauri android init` / `ios init`), pero requiere Android Studio / Xcode y no está generado.
- Firma de código y actualizaciones automáticas no están configuradas: Windows mostrará el aviso de "editor desconocido" hasta que firmes el instalador.

---

## Arquitectura

### Base de datos (`supabase/migrations/`)

| Archivo                         | Contenido                                                        |
| ------------------------------- | ---------------------------------------------------------------- |
| `…01_esquema.sql`               | enums, tablas, índices, FKs compuestas                           |
| `…02_funciones_y_triggers.sql`  | `mi_restaurante_id()`, `mi_rol()`, `mi_contexto()`, triggers     |
| `…03_rls.sql`                   | privilegios y políticas RLS                                      |
| `…04_rpc_publicas_y_realtime.sql` | `obtener_carta`, `crear_pedido_qr`, publicación Realtime        |
| `20261118…_onboarding_invitaciones.sql` | `invitaciones`, `crear_mi_restaurante`, `unirme_con_codigo`, `generar_invitacion` |
| `20261119…_pedidos_mozo.sql` | `crear_pedido_mozo`, total de la cuenta abierta en vivo, Realtime de `sesiones_mesa` |
| `20261121…_pedido_mozo_idempotente.sql` | `crear_pedido_mozo` con ID propio (reintentos sin duplicar) |
| `20261120…_stock_ganancias.sql` | descuento/devolución automática de stock, `registrar_movimiento_stock`, `resumen_ganancias`, `productos_mas_vendidos` |

Ajustes respecto al esquema inicial:

- **FKs compuestas `(restaurante_id, id)`**: RLS filtra lecturas, pero no impide que un INSERT apunte a una fila de
  otro restaurante. Con estas FKs es imposible a nivel de base.
- **`restaurante_id` en `pedido_items`** (lo completa un trigger): RLS y filtros de Realtime simples.
- **`restaurante_id` automático** en los INSERT (trigger): el frontend no necesita mandarlo.
- **Snapshot por trigger**: `pedido_items` toma nombre/precio/costo de `productos` siempre, también cuando el pedido lo carga un mozo.
- **Totales automáticos**: `pedidos.total` se recalcula con sus items; `sesiones_mesa.total` se calcula al cerrarla.
- **Sesión ↔ mesa**: abrir sesión marca la mesa `ocupada`; cerrarla la vuelve a `libre`. Una sola sesión abierta por mesa (índice único parcial).
- **`perfiles.activo`** para dar de baja un usuario sin borrarlo; `metodo_pago` como enum.
- **Restricción por columnas según rol** (triggers): la cocina solo cambia `pedidos.estado`; el mozo solo `mesas.estado`.
- **`movimientos_stock.cantidad` con signo** (+ entra, − sale) y sin UPDATE/DELETE (es un log de auditoría).
- **`regenerar_qr_mesa(id)`** (admin) para invalidar un QR impreso.
- Productos con `controla_stock` y `stock_actual <= 0` no aparecen en la carta pública.

**Ganancias** (Fase 4) = Σ `(precio_unitario − costo_unitario) × cantidad` de `pedido_items` de pedidos `entregado`.

> Nota: `costo` es visible para todos los usuarios logueados del restaurante (RLS filtra filas, no columnas).
> Si querés ocultárselo a mozos/cocina, se resuelve en Fase 4 con una vista.

### Anti-spam de pedidos QR

En `crear_pedido_qr`: máximo **5 pedidos por mesa cada 10 minutos**, hasta 30 líneas por pedido y cantidades
de 1 a 50. Las constantes están al principio de la función.

### Frontend (`src/`)

```
app/          App, router (rutas lazy), guards (RequireAuth, RequireRol)
lib/          cliente Supabase, QueryClient, formato ARS, mensajes de error
services/     acceso a datos PURO (sin React) → único lugar que importa `supabase`
hooks/        hooks genéricos (useOnlineStatus)
components/   UI compartida, OfflineBanner
features/     un directorio por módulo (auth, dashboard, mesas, pedidos, cocina, carta, stock, ganancias, carta-publica)
types/        database.ts (generado: npm run db:types)
```

**Capa de datos preparada para trabajar offline:** componentes → hooks (TanStack Query) → `services/*` → Supabase.
En la Fase 5 la cola local de operaciones pendientes se inserta en los servicios (mutaciones), sin tocar componentes.
El aviso **SIN CONEXIÓN** ya se muestra en el dashboard, en el login y en la carta.

**Compatible con Tauri v2:** SPA pura (sin SSR), puerto fijo 5173 y variables `TAURI_ENV_*` habilitadas.

### Roles

| Módulo            | admin | mozo | cocina |
| ----------------- | :---: | :--: | :----: |
| Mesas, Pedidos    |  ✔   |  ✔   |        |
| Cocina            |  ✔   |      |   ✔    |
| Carta, Stock, Equipo, Ganancias | ✔ |   |        |

---

## Scripts npm

| Comando                     | Qué hace                                       |
| --------------------------- | ---------------------------------------------- |
| `npm run dev`               | servidor de desarrollo                          |
| `npm run build`             | typecheck + build de producción en `dist/`      |
| `npm run lint`              | ESLint                                          |
| `npm run db:start`          | `supabase start`                                |
| `npm run db:reset`          | reaplica migraciones + seed (local)             |
| `npm run db:test`           | tests pgTAP                                     |
| `npm test`                  | tests unitarios (cola offline)                  |
| `npm run tauri:dev` / `tauri:build` | app de escritorio                        |
| `npm run db:types`          | regenera `src/types/database.ts` desde la base local |
| `npm run crear-restaurante` | alta de restaurante + admin                     |
| `npm run crear-usuario`     | alta de usuario en un restaurante existente     |

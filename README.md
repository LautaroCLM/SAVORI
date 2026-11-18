# Sistema de gestión para restaurantes

Multi-restaurante (multi-tenant) sobre **Supabase**, con frontend **React + Vite + TypeScript + Tailwind**.
Interfaz en español (Argentina), moneda ARS.

> **Estado:** Fase 1 lista (scaffold, base de datos, auth, layout, onboarding) y Fase 2 parcial: ABM de carta (categorías y productos), salones y mesas, y QR imprimible por mesa. Falta la subida de imágenes a Cloudflare R2.

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

Corre `supabase/tests/aislamiento_test.sql` (pgTAP) y `onboarding_test.sql` (76 tests en total), que verifica entre otras cosas:

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

## Arquitectura

### Base de datos (`supabase/migrations/`)

| Archivo                         | Contenido                                                        |
| ------------------------------- | ---------------------------------------------------------------- |
| `…01_esquema.sql`               | enums, tablas, índices, FKs compuestas                           |
| `…02_funciones_y_triggers.sql`  | `mi_restaurante_id()`, `mi_rol()`, `mi_contexto()`, triggers     |
| `…03_rls.sql`                   | privilegios y políticas RLS                                      |
| `…04_rpc_publicas_y_realtime.sql` | `obtener_carta`, `crear_pedido_qr`, publicación Realtime        |
| `20261118…_onboarding_invitaciones.sql` | `invitaciones`, `crear_mi_restaurante`, `unirme_con_codigo`, `generar_invitacion` |

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
| `npm run db:types`          | regenera `src/types/database.ts` desde la base local |
| `npm run crear-restaurante` | alta de restaurante + admin                     |
| `npm run crear-usuario`     | alta de usuario en un restaurante existente     |

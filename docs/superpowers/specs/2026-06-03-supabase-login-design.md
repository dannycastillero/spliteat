# Spec: SplitEat v3 — Supabase + Login

**Fecha:** 2026-06-03
**Estado:** Aprobado

---

## Descripción

Extensión de SplitEat v2 para agregar persistencia real en producción (Supabase reemplaza SQLite), sistema de login con magic link, e historial de facturas para usuarios autenticados. Se resuelve también el problema crítico de arquitectura: el backend Express no estaba deployado en Vercel.

---

## Problema que se resuelve

El `vercel.json` de v2 solo deployaba el cliente React. Las rutas `/api/bills` (POST y GET) usaban Express + SQLite, que no existía en producción. Solo `/api/ocr` funcionaba (ya era una Vercel serverless function).

**v3 corrige esto** convirtiendo las rutas de bills en Vercel serverless functions y reemplazando SQLite con Supabase Postgres.

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────┐
│  Vercel                                             │
│                                                     │
│  client/dist/          ← React app (Vite, estático) │
│                                                     │
│  api/ocr.js            ← OCR (ya existe) ✓          │
│  api/bills.ts          ← POST /api/bills (nueva)    │
│  api/bills/[billId].ts ← GET  /api/bills/:id (nueva)│
└────────────────────────┬────────────────────────────┘
                         │
               Supabase SDK (desde las functions y el cliente)
                         │
┌────────────────────────▼────────────────────────────┐
│  Supabase                                           │
│                                                     │
│  Auth          ← email + magic link                 │
│  Database      ← tabla bills (reemplaza SQLite)     │
│  RLS policies  ← cada user ve solo sus facturas     │
└─────────────────────────────────────────────────────┘
```

**Qué NO cambia:**
- Todo el flujo de OCR → items → personas (el core de la app)
- La URL de producción (`spliteat.vercel.app`)
- El diseño visual (design system de v2)

---

## Base de datos Supabase

### Tabla `bills`

```sql
CREATE TABLE bills (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  data         JSONB       NOT NULL
);
```

- `user_id = NULL` → factura anónima (usuario no estaba logueado)
- `user_id = <uuid>` → factura asociada al usuario autenticado
- `data` guarda el JSON completo del bill (mismo formato que v2)

### Row Level Security (RLS)

```sql
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede crear una factura (anónimos también)
CREATE POLICY "insert_any" ON bills
  FOR INSERT WITH CHECK (true);

-- Usuarios autenticados ven solo sus propias facturas
CREATE POLICY "select_own" ON bills
  FOR SELECT USING (auth.uid() = user_id);

-- Facturas anónimas son recuperables por billId (para compartir por WhatsApp)
CREATE POLICY "select_by_id_anonymous" ON bills
  FOR SELECT USING (user_id IS NULL);
```

### Índices

```sql
CREATE INDEX idx_bills_user_id    ON bills(user_id);
CREATE INDEX idx_bills_created_at ON bills(created_at DESC);
```

### Estructura del campo `data` (JSONB)

Sin cambios respecto a v2 — mismo objeto que guardaba SQLite:

```json
{
  "items": [...],
  "people": [...],
  "restaurantName": "...",
  "subtotal": 0.00,
  "taxes": 0.00,
  "tip": 0.00,
  "total": 0.00
}
```

---

## Autenticación

### Proveedor

**Supabase Auth con magic link** (email, sin contraseña). El usuario ingresa su email y recibe un enlace para autenticarse. No se requiere contraseña.

Google OAuth puede agregarse en Fase 2 sin cambiar la arquitectura.

### Flujo de usuario

```
Usuario anónimo
    │
    ├── Usa la app normal (OCR, divide la cuenta)
    │
    │   Al cerrar la cuenta:
    │     → bill guardado en Supabase con user_id = NULL
    │     → recibe billId para compartir por WhatsApp ✓
    │
    └── Opcional: hace click en "Iniciar sesión"
          → ingresa su email
          → recibe magic link
          → entra a la app autenticado
          → ve su historial de facturas anteriores
```

Las facturas creadas antes del login permanecen anónimas (sin "claim" de facturas pasadas).

### Estado de auth en el cliente

```typescript
interface AuthState {
  user: User | null     // null = anónimo
  loading: boolean
  signIn: (email: string) => Promise<void>   // envía magic link
  signOut: () => Promise<void>
}
```

El cliente `@supabase/supabase-js` maneja tokens, refresh, y sesión persistida en localStorage.

---

## Vercel Serverless Functions

### `api/bills.ts` — POST (crear factura)

```typescript
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data } = req.body
  const authHeader = req.headers.authorization
  let userId = null

  if (authHeader) {
    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    userId = user?.id ?? null
  }

  const { data: bill, error } = await supabase
    .from('bills')
    .insert({ user_id: userId, data })
    .select('id')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ billId: bill.id })
}
```

### `api/bills/[billId].ts` — GET (recuperar factura)

```typescript
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { billId } = req.query
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: bill } = await supabase
    .from('bills')
    .select('data')
    .eq('id', billId)
    .single()

  if (!bill) return res.status(404).json({ error: 'Not found' })
  res.json(bill.data)
}
```

### Variables de entorno a agregar en Vercel

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   ← solo server-side, nunca expuesta al cliente
ANTHROPIC_API_KEY=...              ← ya existe
```

---

## Cambios en el cliente React

### Nueva dependencia

```bash
npm install @supabase/supabase-js
```

### Nuevos archivos en `client/src/`

```
client/src/
  lib/
    supabase.ts          ← cliente Supabase singleton
  context/
    AuthContext.tsx      ← estado global de auth (user, signIn, signOut)
  components/
    LoginModal.tsx       ← modal: campo email + botón "Enviar enlace"
    Navbar.tsx           ← botón "Iniciar sesión" / avatar si está logueado
  pages/
    HistoryPage.tsx      ← lista de facturas del usuario (solo logueados)
    AuthCallbackPage.tsx ← captura sesión tras magic link redirect
```

### Variable de entorno nueva en el cliente

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Cambio en el guardado de facturas

Al llamar `POST /api/bills`, incluir el token si el usuario está autenticado:

```typescript
const headers: HeadersInit = { 'Content-Type': 'application/json' }
const { data: { session } } = await supabase.auth.getSession()
if (session) {
  headers['Authorization'] = `Bearer ${session.access_token}`
}
await fetch('/api/bills', { method: 'POST', headers, body: JSON.stringify({ data: billData }) })
```

### Nuevas rutas React Router

```
/history         → <HistoryPage />      (redirige a / si no está logueado)
/auth/callback   → <AuthCallbackPage /> (captura sesión post-magic-link)
```

### Cómo `HistoryPage` fetches las facturas

La página de historial consulta Supabase **directamente desde el cliente** usando el `VITE_SUPABASE_ANON_KEY`. El JWT de la sesión activa se envía automáticamente, y las RLS policies garantizan que el usuario solo ve sus propias facturas:

```typescript
const { data: bills } = await supabase
  .from('bills')
  .select('id, created_at, data')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
```

No se necesita un endpoint serverless adicional para el historial.

---

## `vercel.json` actualizado

```json
{
  "buildCommand": "cd client && npm install && npm run build",
  "outputDirectory": "client/dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

---

## Qué pasa con `server/`

El directorio `server/` queda como entorno de desarrollo local. No se elimina porque:
- Los tests existentes (10 server tests) siguen siendo válidos
- Es útil para desarrollo sin necesitar internet

En producción, las Vercel functions reemplazan completamente a Express.

---

## Checklist de configuración manual (pasos fuera del código)

1. Crear proyecto en Supabase (`app.supabase.com`)
2. Ejecutar el SQL de la tabla `bills` y las RLS policies en el SQL Editor de Supabase
3. Habilitar "Email (magic link)" en Supabase → Authentication → Providers
4. Agregar `https://spliteat.vercel.app/auth/callback` en Supabase → Authentication → URL Configuration → Redirect URLs
5. Copiar `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y agregarlos en Vercel → Settings → Environment Variables

---

## Decisiones de diseño

| Decisión | Elección | Razón |
|----------|----------|-------|
| Backend en producción | Vercel Serverless Functions | `api/ocr.js` ya prueba que funciona; sin servicios extra |
| Auth provider | Supabase Auth (magic link) | Ya usamos Supabase; sin contraseñas que gestionar |
| Facturas anónimas | Guardadas con `user_id = NULL` | Datos para analytics de restaurantes sin requerir login |
| Historial | Solo para usuarios autenticados | YAGNI — no mostrar historial anónimo |
| Claim de facturas anónimas | No implementado | Complejidad innecesaria en Fase 1 |
| Google OAuth | No en Fase 1 | Fácil de agregar después sin cambiar arquitectura |

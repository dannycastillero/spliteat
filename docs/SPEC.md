# Spec — SplitEat

**Última actualización:** 2026-06-09

---

## Descripción

Aplicación web mobile-first para dividir cuentas de restaurantes en Panamá. El usuario escanea o sube una foto de la factura, el sistema extrae los items vía OCR (Claude Vision), el usuario asigna cada item a los comensales, y la app genera resúmenes individuales con los impuestos correctos de Panamá (7% ITBMS / 10% alcohol) y propina proporcional. Los resúmenes se comparten vía link corto por WhatsApp.

Login opcional con email+contraseña via Supabase Auth: acceso a historial de facturas propias. Las facturas anónimas funcionan sin login.

URL de producción: `spliteat.vercel.app`

---

## Features implementadas (v3 — en producción)

- Captura de factura: foto con cámara, upload de imagen, o entrada manual
- OCR inteligente con Claude Vision (extrae items, precios, detecta alcohol potencial)
- Edición de items: nombre, precio, cantidad, confirmación de alcohol
- Selector de propina: None / 10% / 15% / 20%
- Asignación de items a personas (con split proporcional)
- Cálculo fiscal correcto: 7% ITBMS en comida, 10% en alcohol
- Resumen individual por persona
- Share page pública vía link corto por WhatsApp (`/s/:code`)
- Login con email+contraseña (signup, signin, forgot password) vía Supabase Auth
- TopBar con botón login/logout y acceso a historial
- Historial de facturas para usuarios autenticados (`/history`)
- TopBar oculto en páginas de share y login
- Facturas anónimas funcionan sin login

---

## Arquitectura actual

```
Vercel (spliteat.vercel.app)
  client/dist/              ← React app (Vite, estático)
  api/ocr.js                ← OCR con Claude Vision
  api/bills.ts              ← POST crear factura (via DB RPC)
  api/bills/[billId].ts     ← GET recuperar por UUID
  api/s/[code].ts           ← GET recuperar por short_code (6 chars)

Supabase (proyecto "SplitEasy", id: kvifhshmhggzmpmcoymx)
  Auth                      ← email + contraseña
  Database (Postgres)
    tabla bills: id, created_at, user_id, data (jsonb), short_code (char 6, unique)
    RLS: insert_any, select_own, select_anonymous
    Función: create_bill(p_user_id, p_data) → genera short_code internamente
```

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | React + TypeScript + Vite + TailwindCSS + @supabase/supabase-js |
| Backend prod | Vercel serverless functions (Node.js + TypeScript) |
| Base de datos | Supabase Postgres con RLS |
| Auth | Supabase Auth (email + contraseña) |
| OCR | Claude Vision (claude-3-5-sonnet) vía Anthropic API |
| Deploy | Vercel (frontend + functions) + Supabase (DB + Auth) |

---

## Modelos de datos

```typescript
interface Item {
  id: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  isAlcohol: boolean
  isPotentialAlcohol: boolean
  assignedTo: string[]
}

interface Person {
  id: string
  name: string
  color: string
}

interface BillState {
  items: Item[]
  people: Person[]
  tipPercentage: number
  rawReceiptImageBase64?: string
}
```

---

## API

| Endpoint | Método | Descripción | Estado |
|----------|--------|-------------|--------|
| `/api/ocr` | POST | Imagen base64 → Claude Vision → items | ✅ Prod |
| `/api/bills` | POST | Crea factura → retorna `{ billId, shortCode }` | ✅ Prod |
| `/api/bills/:billId` | GET | Recupera factura por UUID | ✅ Prod |
| `/api/s/:code` | GET | Recupera factura por short_code (6 chars) | ✅ Prod |

---

## Rutas del frontend

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | CaptureStep | Pantalla inicial — cámara / upload / manual |
| `/login` | LoginPage | Login y signup con email+contraseña |
| `/auth/callback` | AuthCallbackPage | Captura sesión post-login |
| `/history` | HistoryPage | Historial de facturas del usuario |
| `/s/:code` | SharePage | Vista pública de factura por short link |
| `/share/:billId` | SharePage | Vista pública por UUID (legacy) |

---

## Lógica fiscal de Panamá

| Categoría | Impuesto |
|-----------|----------|
| Comida y bebidas sin alcohol | 7% ITBMS |
| Bebidas alcohólicas | 10% |
| Propina | No es impuesto — proporcional al subtotal de cada persona |

---

## Design System

| Token | Valor |
|-------|-------|
| Primary (Appetite Coral) | `#FF5F5F` |
| Secondary (Action Mint) | `#2EE59D` |
| Tertiary (Sky Cyan) | `#47D1FF` |
| Font headings | Montserrat |
| Font body | Quicksand |
| Border radius botones | `rounded-full` |
| Border radius cards | `rounded-2xl` |

---

## Ejecución local

```bash
npm run dev   # levanta frontend (Vite, puerto 5173) y backend Express (puerto 3001)
```

Variables de entorno requeridas:
- `server/.env`: `ANTHROPIC_API_KEY`, `PORT=3001`, `DATABASE_PATH`
- `client/.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL=http://localhost:3001`

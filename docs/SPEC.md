# Spec — SplitEat

**Última actualización:** 2026-06-03

---

## Descripción

Aplicación web mobile-first para dividir cuentas de restaurantes en Panamá. El usuario escanea o sube una foto de la factura, el sistema extrae los items vía OCR (Claude Vision), el usuario asigna cada item a los comensales, y la app genera resúmenes individuales con los impuestos correctos de Panamá (7% ITBMS / 10% alcohol) y propina proporcional. Los resúmenes se comparten vía link por WhatsApp.

Login opcional: acceso a historial de facturas propias y (en Fase 2) descuentos de comercios afiliados.

---

## Features implementadas (v2)

- Captura de factura: foto con cámara, upload de imagen, o entrada manual
- OCR inteligente con Claude Vision (extrae items, precios, detecta alcohol potencial)
- Edición de items: nombre, precio, cantidad, confirmación de alcohol
- Selector de propina: None / 10% / 15% / 20%
- Asignación de items a personas (con split proporcional)
- Cálculo fiscal correcto: 7% ITBMS en comida, 10% en alcohol
- Resumen individual por persona
- Share page pública por WhatsApp (`/share/:billId`)
- Panel de admin (`/admin`) con login protegido por JWT
- Historial local de últimas facturas (localStorage)

---

## Features en diseño (v3)

- Supabase como base de datos en producción (reemplaza SQLite)
- Login con magic link (email, sin contraseña)
- Historial de facturas para usuarios autenticados (`/history`)
- Facturas anónimas siguen funcionando sin login

---

## Arquitectura actual (v2 en producción)

```
Vercel
  client/dist/     ← React app (Vite, estático)
  api/ocr.js       ← Vercel serverless function (funciona ✓)

NO deployado (solo dev):
  server/          ← Express + SQLite
```

**Problema:** `/api/bills` no existe en producción. Las facturas no se guardan realmente en Vercel hoy.

---

## Arquitectura objetivo (v3)

```
Vercel
  client/dist/              ← React app (Vite, estático)
  api/ocr.js                ← Vercel serverless function ✓
  api/bills.ts              ← POST (crear factura) — nueva
  api/bills/[billId].ts     ← GET (recuperar factura) — nueva

Supabase
  Auth                      ← magic link
  Database (Postgres)       ← tabla bills con RLS
```

---

## Stack técnico

| Capa | v2 | v3 |
|------|----|----|
| Frontend | React + TypeScript + Vite + TailwindCSS | mismo + @supabase/supabase-js |
| Backend prod | `api/ocr.js` (Vercel function) | + `api/bills.ts`, `api/bills/[billId].ts` |
| Backend dev | Express + TypeScript | mismo (sin cambios) |
| Base de datos | SQLite (solo dev) | Supabase Postgres |
| Auth | JWT propio (solo admin) | Supabase Auth (magic link) |
| Deploy | Vercel | Vercel + Supabase |

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
| `/api/bills` | POST | Guarda factura → retorna `billId` | ⚠️ Solo dev |
| `/api/bills/:billId` | GET | Recupera factura para share page | ⚠️ Solo dev |

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
npm run dev   # levanta frontend (puerto 3000) y backend Express (puerto 3001)
```

Variables de entorno requeridas:
- `server/.env`: `ANTHROPIC_API_KEY`, `PORT=3001`, `DATABASE_PATH`
- `client/.env`: `VITE_API_URL=http://localhost:3001`

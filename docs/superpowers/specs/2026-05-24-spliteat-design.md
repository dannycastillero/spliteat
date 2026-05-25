# Spec: SplitEat MVP

**Fecha:** 2026-05-24
**Estado:** Aprobado

---

## Descripción

Aplicación web mobile-first para dividir cuentas de restaurantes en Panamá. El usuario escanea una factura con la cámara o sube una foto, el sistema extrae los items via OCR inteligente (Claude Vision), el usuario asigna cada item a los comensales, y la app genera resúmenes individuales con los impuestos correctos de Panamá y propina proporcional. Los resúmenes se comparten vía link web por WhatsApp.

---

## Flujo de la aplicación

```
[Home] → [Review: Check the Bill] → [Assign: Who's eating?] → [Summary] → [Share Page pública]
```

1. **Home** — El usuario elige cómo ingresar la factura: foto con cámara, subir imagen, o entrada manual. Muestra hasta 5 facturas recientes (guardadas en `localStorage` como `{ billId, date, total }`) con opción "Clear All".
2. **Review** — Se muestran los items extraídos por OCR. El usuario puede editar nombres/precios, confirmar qué items son alcohol, agregar items manualmente (formulario simple: nombre, precio, cantidad), y elegir el % de propina (None / 10% / 15% / 20%).
3. **Assign** — El usuario agrega personas (nombre + color de avatar) y asigna cada item a uno o varios comensales tocando los avatares. Un item asignado a múltiples personas se divide en partes iguales.
4. **Summary** — Resumen individual por persona con su subtotal de comida, subtotal de alcohol, ITBMS 7%, impuesto licor 10%, propina y total. Botón para generar link y compartir por WhatsApp.
5. **Share Page** — URL pública (`/share/:billId`) que muestra: lista de todos los items, desglose individual de cada persona (lo mismo que Summary), y el total general de la cuenta. No requiere sesión ni estado local.

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | React + TypeScript + Vite + TailwindCSS |
| Backend | Express + TypeScript |
| Base de datos | SQLite (`better-sqlite3`) |
| OCR | Claude Vision API |
| Routing | React Router v6 |
| Estado | React Context (sesión en memoria) |
| Monorepo | Carpetas `client/` y `server/` bajo raíz |

---

## Estructura de archivos

```
SplitEat/
├── client/
│   └── src/
│       ├── pages/           # HomePage, ReviewPage, AssignPage, SummaryPage, SharePage
│       ├── components/      # BottomNav, ItemRow, PersonAvatar, TipSelector, AlcoholChip
│       ├── context/         # BillContext.tsx
│       ├── lib/             # taxCalculator.ts, alcoholKeywords.ts
│       └── api/             # client.ts (fetch helpers)
├── server/
│   └── src/
│       ├── routes/          # ocr.route.ts, bills.route.ts
│       ├── services/        # ocr.service.ts, bill.service.ts
│       └── db/              # schema.ts, queries.ts
├── package.json             # script "dev" con concurrently
└── README.md
```

---

## Modelos de datos

```typescript
interface Item {
  id: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number          // unitPrice × quantity
  isAlcohol: boolean          // confirmado por el usuario
  isPotentialAlcohol: boolean // detectado automáticamente por OCR/keywords
  assignedTo: string[]        // IDs de personas
}

interface Person {
  id: string
  name: string
  color: string               // color del avatar
}

interface BillState {
  items: Item[]
  people: Person[]
  tipPercentage: number       // 0, 10, 15, 20
  rawReceiptImageBase64?: string
}
```

---

## API del backend

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/ocr` | POST | Recibe imagen base64 → llama Claude Vision → retorna items estructurados |
| `/api/bills` | POST | Guarda el estado completo en SQLite → retorna `{ billId, shareUrl }` |
| `/api/bills/:billId` | GET | Retorna datos de la factura para la share page |

---

## Lógica fiscal de Panamá

| Categoría | Impuesto |
|-----------|----------|
| Comida y bebidas sin alcohol | 7% ITBMS |
| Bebidas alcohólicas | 10% |
| Propina | No es impuesto — se divide proporcionalmente al subtotal de cada persona |

**Cálculo por persona:**
```
foodSubtotal    = suma de mis items no-alcohólicos (dividido si compartido)
alcoholSubtotal = suma de mis items alcohólicos (dividido si compartido)
foodTax         = foodSubtotal × 0.07
alcoholTax      = alcoholSubtotal × 0.10
tipShare        = (miSubtotal / totalSubtotal) × propinaToral
total           = foodSubtotal + alcoholSubtotal + foodTax + alcoholTax + tipShare
```

**Invariante:** `Σ total de todas las personas = total de la factura`. Si la diferencia es > $0.01, mostrar alerta.

---

## Detección de alcohol

1. El prompt de OCR indica a Claude que marque `isPotentialAlcohol: true` según keywords.
2. Keywords incluyen: ron, cerveza, vino, whisky, vodka, tequila, gin, balboa, seco, absolut, botella, trago, cóctel, licorera, beer, wine, rum, bourbon, champagne, prosecco, sangria, daiquiri, mojito (y variantes).
3. En la pantalla Review, los items sospechosos muestran un chip naranja **"¿Licor?"** con toggle de confirmación.
4. El usuario puede también marcar/desmarcar cualquier item manualmente.

---

## Compartir por WhatsApp

1. Usuario presiona "Share Summary Link" en Summary.
2. Frontend llama `POST /api/bills` con el estado completo.
3. Backend guarda en SQLite, genera `billId` (UUID v4), retorna `shareUrl`.
4. Frontend abre: `https://wa.me/?text=Aquí está el resumen de nuestra cuenta: {shareUrl}`
5. La Share Page es una ruta React pública que carga los datos del backend sin sesión.

---

## Design System

Basado en el DESIGN.md generado por Google Stitch:

| Token | Valor |
|-------|-------|
| Primary (Appetite Coral) | `#FF5F5F` |
| Secondary (Action Mint) | `#2EE59D` |
| Tertiary (Sky Cyan) | `#47D1FF` |
| Font headings | Montserrat |
| Font body | Quicksand |
| Border radius botones | `rounded-full` (pill) |
| Border radius cards | `rounded-2xl` |

Bottom navigation: 4 tabs — Upload · Review · Assign · Summary.

---

## Base de datos SQLite

```sql
CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  data TEXT NOT NULL           -- JSON: BillState + breakdowns calculados
);
```

---

## Ejecución

```bash
npm run dev   # levanta frontend (3000) y backend (3001)
```

Variables de entorno requeridas:
- `server/.env`: `ANTHROPIC_API_KEY`, `PORT=3001`, `DATABASE_PATH`
- `client/.env`: `VITE_API_URL=http://localhost:3001`

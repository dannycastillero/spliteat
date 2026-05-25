# SplitEat MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una web app mobile-first que permite escanear facturas de restaurante, asignar items a personas, aplicar impuestos de Panamá (7% ITBMS / 10% licor) y compartir el resumen por WhatsApp.

**Architecture:** Monorepo con `client/` (React + Vite + TailwindCSS) y `server/` (Express + TypeScript + SQLite). El servidor expone `/api/ocr` (llama Claude Vision) y `/api/bills` (persiste y retorna facturas). El frontend maneja todo el estado de sesión en React Context; al final genera un link `/share/:billId` que carga datos del backend sin sesión.

**Tech Stack:** React 18, React Router v6, TailwindCSS 3, Vite 5, Express 4, better-sqlite3, @anthropic-ai/sdk, Vitest, tsx

---

## Mapa de archivos

```
SplitEat/
├── package.json                          # root: script "dev" con concurrently
├── README.md
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts                    # proxy /api → localhost:3001, vitest config
│   ├── tailwind.config.ts                # design tokens del mockup
│   ├── postcss.config.js
│   ├── index.html                        # Google Fonts (Montserrat + Quicksand)
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                        # Router + BillProvider
│       ├── types.ts                       # Item, Person, BillState, PersonBreakdown
│       ├── context/
│       │   └── BillContext.tsx            # estado global de sesión + acciones
│       ├── lib/
│       │   ├── taxCalculator.ts           # calculatePersonBreakdown, validateBillTotal
│       │   └── taxCalculator.test.ts
│       ├── api/
│       │   └── client.ts                  # ocrReceipt(), saveBill(), getBill()
│       ├── components/
│       │   ├── BottomNav.tsx
│       │   ├── PersonAvatar.tsx
│       │   ├── ItemRow.tsx
│       │   ├── AlcoholChip.tsx
│       │   └── TipSelector.tsx
│       └── pages/
│           ├── HomePage.tsx
│           ├── ReviewPage.tsx
│           ├── AssignPage.tsx
│           ├── SummaryPage.tsx
│           └── SharePage.tsx
└── server/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts                       # Express app entry
        ├── db/
        │   ├── schema.ts                  # getDb(), initDb()
        │   ├── queries.ts                 # saveBill(), getBill()
        │   └── queries.test.ts
        ├── services/
        │   ├── ocr.service.ts             # extractItemsFromImage()
        │   └── ocr.service.test.ts
        └── routes/
            ├── ocr.route.ts               # POST /api/ocr
            └── bills.route.ts             # POST /api/bills, GET /api/bills/:id
```

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `package.json` (root)
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/tailwind.config.ts`
- Create: `client/postcss.config.js`
- Create: `client/index.html`
- Create: `server/.env.example`
- Create: `client/.env.example`

- [ ] **Step 1: Crear root package.json**

```json
{
  "name": "spliteat",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\""
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 2: Crear server/package.json**

```json
{
  "name": "spliteat-server",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run --environment node"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "better-sqlite3": "^11.3.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.1",
    "uuid": "^11.0.3"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 3: Crear server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Crear client/package.json**

```json
{
  "name": "spliteat-client",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 5: Crear client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Crear client/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 7: Crear client/tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF5F5F',
        'primary-dark': '#B3272E',
        secondary: '#2EE59D',
        tertiary: '#47D1FF',
        surface: '#F8F9FA',
        'on-surface': '#191C1D',
        'on-surface-variant': '#59413F',
      },
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 8: Crear client/postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 9: Crear client/index.html**

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <title>SplitEat</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Quicksand:wght@500;700&display=swap" rel="stylesheet" />
  </head>
  <body class="bg-surface">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 10: Crear archivos de variables de entorno**

`server/.env.example`:
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
DATABASE_PATH=./spliteat.db
```

`client/.env.example`:
```
VITE_API_URL=http://localhost:3001
```

Copiar `server/.env.example` → `server/.env` y llenar `ANTHROPIC_API_KEY`.

- [ ] **Step 11: Instalar dependencias**

```bash
npm install
npm install --prefix server
npm install --prefix client
```

- [ ] **Step 12: Commit**

```bash
git add package.json server/package.json server/tsconfig.json client/package.json client/tsconfig.json client/vite.config.ts client/tailwind.config.ts client/postcss.config.js client/index.html server/.env.example client/.env.example
git commit -m "chore: monorepo scaffold with server and client setup"
```

---

## Task 2: Tipos compartidos + Tax Calculator (TDD)

**Files:**
- Create: `client/src/types.ts`
- Create: `client/src/lib/taxCalculator.ts`
- Create: `client/src/lib/taxCalculator.test.ts`
- Create: `client/src/test/setup.ts`

- [ ] **Step 1: Crear client/src/test/setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 2: Crear client/src/types.ts**

```typescript
export interface Item {
  id: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number        // unitPrice × quantity
  isAlcohol: boolean        // confirmado por el usuario
  isPotentialAlcohol: boolean  // detectado por OCR
  assignedTo: string[]      // IDs de personas
}

export interface Person {
  id: string
  name: string
  color: string             // hex color del avatar
}

export interface BillState {
  items: Item[]
  people: Person[]
  tipPercentage: number     // 0 | 10 | 15 | 20
  rawReceiptImageBase64?: string
}

export interface PersonBreakdown {
  personId: string
  foodSubtotal: number
  alcoholSubtotal: number
  foodTax: number           // foodSubtotal × 0.07
  alcoholTax: number        // alcoholSubtotal × 0.10
  tipShare: number          // proporcional al subtotal
  total: number
}

export interface SavedBill extends BillState {
  breakdowns?: PersonBreakdown[]  // presente al leer del servidor; ausente si se construye en el cliente
}
```

- [ ] **Step 3: Escribir los tests que deben fallar**

`client/src/lib/taxCalculator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculatePersonBreakdown, validateBillTotal, calculateAllBreakdowns } from './taxCalculator'
import type { Item, Person } from '../types'

const makePerson = (id: string): Person => ({ id, name: id, color: '#FF5F5F' })

const makeItem = (overrides: Partial<Item>): Item => ({
  id: 'i1',
  name: 'Burger',
  quantity: 1,
  unitPrice: 10,
  totalPrice: 10,
  isAlcohol: false,
  isPotentialAlcohol: false,
  assignedTo: ['p1'],
  ...overrides,
})

describe('calculatePersonBreakdown', () => {
  it('aplica 7% ITBMS a items de comida', () => {
    const person = makePerson('p1')
    const items = [makeItem({ assignedTo: ['p1'] })]
    const result = calculatePersonBreakdown(person, items, 0)

    expect(result.foodSubtotal).toBe(10)
    expect(result.foodTax).toBeCloseTo(0.7)
    expect(result.alcoholSubtotal).toBe(0)
    expect(result.alcoholTax).toBe(0)
    expect(result.tipShare).toBe(0)
    expect(result.total).toBeCloseTo(10.7)
  })

  it('aplica 10% a items de alcohol', () => {
    const person = makePerson('p1')
    const items = [makeItem({ isAlcohol: true, assignedTo: ['p1'] })]
    const result = calculatePersonBreakdown(person, items, 0)

    expect(result.alcoholSubtotal).toBe(10)
    expect(result.alcoholTax).toBeCloseTo(1.0)
    expect(result.foodTax).toBe(0)
    expect(result.total).toBeCloseTo(11.0)
  })

  it('divide items compartidos en partes iguales', () => {
    const p1 = makePerson('p1')
    const items = [makeItem({ totalPrice: 20, assignedTo: ['p1', 'p2'] })]
    const result = calculatePersonBreakdown(p1, items, 0)

    expect(result.foodSubtotal).toBe(10)   // 20 / 2
    expect(result.total).toBeCloseTo(10.7) // 10 + 7%
  })

  it('calcula propina proporcional al subtotal', () => {
    const p1 = makePerson('p1')
    const p2 = makePerson('p2')
    const items = [
      makeItem({ id: 'i1', totalPrice: 30, assignedTo: ['p1'] }),
      makeItem({ id: 'i2', totalPrice: 70, assignedTo: ['p2'] }),
    ]
    // p1 tiene 30 de 100 total → 30% de la propina
    // 10% de 100 = 10 de propina total → p1 paga 3
    const result = calculatePersonBreakdown(p1, items, 10)

    expect(result.tipShare).toBeCloseTo(3)
  })

  it('retorna 0 de propina cuando tipPercentage es 0', () => {
    const person = makePerson('p1')
    const items = [makeItem({ assignedTo: ['p1'] })]
    const result = calculatePersonBreakdown(person, items, 0)

    expect(result.tipShare).toBe(0)
  })

  it('ignora items no asignados a esta persona', () => {
    const person = makePerson('p1')
    const items = [makeItem({ assignedTo: ['p2'] })]
    const result = calculatePersonBreakdown(person, items, 0)

    expect(result.total).toBe(0)
  })
})

describe('validateBillTotal', () => {
  it('retorna true cuando la suma cuadra', () => {
    const p1 = makePerson('p1')
    const p2 = makePerson('p2')
    const items = [
      makeItem({ id: 'i1', totalPrice: 100, assignedTo: ['p1'] }),
      makeItem({ id: 'i2', isAlcohol: true, totalPrice: 50, assignedTo: ['p2'] }),
    ]
    const breakdowns = calculateAllBreakdowns([p1, p2], items, 0)

    expect(validateBillTotal(breakdowns, items, 0)).toBe(true)
  })
})
```

- [ ] **Step 4: Ejecutar tests y verificar que fallan**

```bash
npm test --prefix client
```

Resultado esperado: **FAIL** — `Cannot find module './taxCalculator'`

- [ ] **Step 5: Implementar client/src/lib/taxCalculator.ts**

```typescript
import type { Item, Person, PersonBreakdown } from '../types'

export function calculatePersonBreakdown(
  person: Person,
  items: Item[],
  tipPercentage: number
): PersonBreakdown {
  const myItems = items.filter(i => i.assignedTo.includes(person.id))

  let foodSubtotal = 0
  let alcoholSubtotal = 0

  for (const item of myItems) {
    const share = item.totalPrice / item.assignedTo.length
    if (item.isAlcohol) {
      alcoholSubtotal += share
    } else {
      foodSubtotal += share
    }
  }

  const foodTax = foodSubtotal * 0.07
  const alcoholTax = alcoholSubtotal * 0.10

  const mySubtotal = foodSubtotal + alcoholSubtotal
  const grandSubtotal = items.reduce((sum, i) => sum + i.totalPrice, 0)
  const totalTip = grandSubtotal * (tipPercentage / 100)
  const tipShare = grandSubtotal > 0 ? (mySubtotal / grandSubtotal) * totalTip : 0

  return {
    personId: person.id,
    foodSubtotal,
    alcoholSubtotal,
    foodTax,
    alcoholTax,
    tipShare,
    total: foodSubtotal + alcoholSubtotal + foodTax + alcoholTax + tipShare,
  }
}

export function calculateAllBreakdowns(
  people: Person[],
  items: Item[],
  tipPercentage: number
): PersonBreakdown[] {
  return people.map(p => calculatePersonBreakdown(p, items, tipPercentage))
}

export function validateBillTotal(
  breakdowns: PersonBreakdown[],
  items: Item[],
  tipPercentage: number
): boolean {
  const grandSubtotal = items.reduce((sum, i) => sum + i.totalPrice, 0)
  const totalTip = grandSubtotal * (tipPercentage / 100)
  const totalFoodTax = items
    .filter(i => !i.isAlcohol)
    .reduce((sum, i) => sum + i.totalPrice * 0.07, 0)
  const totalAlcoholTax = items
    .filter(i => i.isAlcohol)
    .reduce((sum, i) => sum + i.totalPrice * 0.10, 0)
  const expectedTotal = grandSubtotal + totalFoodTax + totalAlcoholTax + totalTip

  const actualTotal = breakdowns.reduce((sum, b) => sum + b.total, 0)
  return Math.abs(expectedTotal - actualTotal) <= 0.01
}
```

- [ ] **Step 6: Ejecutar tests y verificar que pasan**

```bash
npm test --prefix client
```

Resultado esperado: **PASS** — todos los tests en verde.

- [ ] **Step 7: Commit**

```bash
git add client/src/types.ts client/src/lib/taxCalculator.ts client/src/lib/taxCalculator.test.ts client/src/test/setup.ts
git commit -m "feat: add shared types and tax calculator with Panama rates"
```

---

## Task 3: Backend — Base de datos SQLite (TDD)

**Files:**
- Create: `server/src/db/schema.ts`
- Create: `server/src/db/queries.ts`
- Create: `server/src/db/queries.test.ts`

- [ ] **Step 1: Escribir tests que deben fallar**

`server/src/db/queries.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { initDb, getDb } from './schema'
import { saveBill, getBill } from './queries'

beforeEach(() => {
  // Usar base de datos en memoria para tests
  process.env.DATABASE_PATH = ':memory:'
  initDb()
})

afterEach(() => {
  // Cerrar y resetear la conexión
  getDb().close()
  // @ts-ignore — resetear singleton para el próximo test
  ;(globalThis as any).__db = undefined
})

describe('saveBill / getBill', () => {
  it('guarda y recupera una factura por ID', () => {
    const data = { items: [{ id: '1', name: 'Burger' }], people: [], tipPercentage: 0 }
    saveBill('bill-123', data)

    const result = getBill('bill-123')
    expect(result).toEqual(data)
  })

  it('retorna null para un ID que no existe', () => {
    const result = getBill('nonexistent')
    expect(result).toBeNull()
  })

  it('serializa correctamente datos anidados', () => {
    const data = {
      items: [{ id: '1', name: 'Beer', isAlcohol: true, assignedTo: ['p1', 'p2'] }],
      people: [{ id: 'p1', name: 'Ana', color: '#FF5F5F' }],
      tipPercentage: 10,
      breakdowns: [{ personId: 'p1', total: 5.50 }],
    }
    saveBill('bill-456', data)

    const result = getBill('bill-456')
    expect(result).toEqual(data)
  })
})
```

- [ ] **Step 2: Ejecutar tests y verificar que fallan**

```bash
npm test --prefix server
```

Resultado esperado: **FAIL** — `Cannot find module './schema'`

- [ ] **Step 3: Implementar server/src/db/schema.ts**

```typescript
import Database from 'better-sqlite3'

const DB_PATH = process.env.DATABASE_PATH || './spliteat.db'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
  }
  return db
}

export function initDb(): void {
  const database = getDb()
  database.exec(`
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `)
}
```

- [ ] **Step 4: Implementar server/src/db/queries.ts**

```typescript
import { getDb } from './schema'

interface BillRow {
  data: string
}

export function saveBill(id: string, data: object): void {
  getDb()
    .prepare('INSERT INTO bills (id, created_at, data) VALUES (?, ?, ?)')
    .run(id, Date.now(), JSON.stringify(data))
}

export function getBill(id: string): object | null {
  const row = getDb()
    .prepare('SELECT data FROM bills WHERE id = ?')
    .get(id) as BillRow | undefined
  return row ? JSON.parse(row.data) : null
}
```

- [ ] **Step 5: Corregir el afterEach en el test para resetear el singleton**

Actualizar `server/src/db/schema.ts` para exponer el reset (solo para tests):

```typescript
import Database from 'better-sqlite3'

const DB_PATH = process.env.DATABASE_PATH || './spliteat.db'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
  }
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function initDb(): void {
  const database = getDb()
  database.exec(`
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `)
}
```

Actualizar el afterEach del test:

```typescript
afterEach(() => {
  closeDb()
})
```

(Quitar la línea `(globalThis as any).__db = undefined`)

- [ ] **Step 6: Ejecutar tests y verificar que pasan**

```bash
npm test --prefix server
```

Resultado esperado: **PASS**

- [ ] **Step 7: Commit**

```bash
git add server/src/db/schema.ts server/src/db/queries.ts server/src/db/queries.test.ts
git commit -m "feat: add SQLite database layer with save/get bill queries"
```

---

## Task 4: Backend — OCR Service (TDD con mock de Anthropic)

**Files:**
- Create: `server/src/services/ocr.service.ts`
- Create: `server/src/services/ocr.service.test.ts`

- [ ] **Step 1: Escribir el test que debe fallar**

`server/src/services/ocr.service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractItemsFromImage } from './ocr.service'

vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn()
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  }
})

// Helper para acceder al mock
async function getMockCreate() {
  const mod = await import('@anthropic-ai/sdk')
  return (mod as any).__mockCreate as ReturnType<typeof vi.fn>
}

describe('extractItemsFromImage', () => {
  it('parsea correctamente una respuesta válida de Claude', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            items: [
              { name: 'Burger', quantity: 1, unitPrice: 15.00, totalPrice: 15.00, isPotentialAlcohol: false },
              { name: 'Cerveza Balboa', quantity: 2, unitPrice: 3.50, totalPrice: 7.00, isPotentialAlcohol: true },
            ],
            detectedTipPercentage: null,
          }),
        },
      ],
    })

    const result = await extractItemsFromImage('base64imagedata')

    expect(result.items).toHaveLength(2)
    expect(result.items[0].name).toBe('Burger')
    expect(result.items[0].isPotentialAlcohol).toBe(false)
    expect(result.items[1].name).toBe('Cerveza Balboa')
    expect(result.items[1].isPotentialAlcohol).toBe(true)
    expect(result.detectedTipPercentage).toBeNull()
  })

  it('extrae JSON incluso cuando hay texto extra alrededor', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: 'Aquí está el resultado:\n```json\n{"items": [{"name": "Pizza", "quantity": 1, "unitPrice": 12.00, "totalPrice": 12.00, "isPotentialAlcohol": false}], "detectedTipPercentage": 10}\n```',
        },
      ],
    })

    const result = await extractItemsFromImage('base64imagedata')

    expect(result.items[0].name).toBe('Pizza')
    expect(result.detectedTipPercentage).toBe(10)
  })

  it('lanza error cuando la respuesta no contiene JSON válido', async () => {
    const mockCreate = await getMockCreate()
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'No puedo leer esta imagen' }],
    })

    await expect(extractItemsFromImage('base64imagedata')).rejects.toThrow('No valid JSON in OCR response')
  })
})
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
npm test --prefix server
```

Resultado esperado: **FAIL** — `Cannot find module './ocr.service'`

- [ ] **Step 3: Implementar server/src/services/ocr.service.ts**

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export interface OcrItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  isPotentialAlcohol: boolean
}

export interface OcrResult {
  items: OcrItem[]
  detectedTipPercentage: number | null
}

const OCR_PROMPT = `Analiza esta imagen de una factura de restaurante y extrae los items.
Retorna SOLO JSON válido con este formato exacto, sin texto adicional:
{
  "items": [
    {
      "name": "nombre del item",
      "quantity": 1,
      "unitPrice": 0.00,
      "totalPrice": 0.00,
      "isPotentialAlcohol": false
    }
  ],
  "detectedTipPercentage": null
}

Reglas:
- NO incluyas líneas de subtotal, impuestos, propina o total — solo items individuales
- isPotentialAlcohol = true si el nombre sugiere bebida alcohólica (ron, cerveza, vino, whisky, vodka, tequila, gin, balboa, seco, absolut, botella, trago, cóctel, licorera, beer, wine, rum, bourbon, champagne, prosecco, sangria, daiquiri, mojito)
- Si hay propina sugerida en la factura incluye el porcentaje en detectedTipPercentage (ej: 10), si no hay pon null
- Precios en números decimales sin símbolo de moneda
- Si un item tiene cantidad > 1: unitPrice = precio unitario, totalPrice = unitPrice × quantity`

export async function extractItemsFromImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
): Promise<OcrResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          { type: 'text', text: OCR_PROMPT },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No valid JSON in OCR response')

  return JSON.parse(jsonMatch[0]) as OcrResult
}
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

```bash
npm test --prefix server
```

Resultado esperado: **PASS**

- [ ] **Step 5: Commit**

```bash
git add server/src/services/ocr.service.ts server/src/services/ocr.service.test.ts
git commit -m "feat: add OCR service using Claude Vision API"
```

---

## Task 5: Backend — Routes y Express app

**Files:**
- Create: `server/src/routes/ocr.route.ts`
- Create: `server/src/routes/bills.route.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Crear server/src/routes/ocr.route.ts**

```typescript
import { Router, Request, Response } from 'express'
import { extractItemsFromImage } from '../services/ocr.service'

const router = Router()

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { imageBase64, mediaType } = req.body as {
    imageBase64?: string
    mediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  }

  if (!imageBase64) {
    res.status(400).json({ error: 'imageBase64 is required' })
    return
  }

  try {
    const result = await extractItemsFromImage(imageBase64, mediaType)
    res.json(result)
  } catch (error) {
    console.error('OCR error:', error)
    res.status(500).json({ error: 'Failed to extract items from image' })
  }
})

export default router
```

- [ ] **Step 2: Crear server/src/routes/bills.route.ts**

```typescript
import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { saveBill, getBill } from '../db/queries'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  const billData = req.body

  if (!billData?.items || !billData?.people) {
    res.status(400).json({ error: 'Invalid bill data: items and people are required' })
    return
  }

  const billId = uuidv4()
  saveBill(billId, billData)
  res.json({ billId })
})

router.get('/:billId', (req: Request, res: Response): void => {
  const { billId } = req.params
  const bill = getBill(billId)

  if (!bill) {
    res.status(404).json({ error: 'Bill not found' })
    return
  }

  res.json(bill)
})

export default router
```

- [ ] **Step 3: Crear server/src/index.ts**

```typescript
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDb } from './db/schema'
import ocrRouter from './routes/ocr.route'
import billsRouter from './routes/bills.route'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' })) // las imágenes de recibos pueden ser grandes

app.use('/api/ocr', ocrRouter)
app.use('/api/bills', billsRouter)

initDb()

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
```

- [ ] **Step 4: Verificar que el servidor inicia**

```bash
npm run dev --prefix server
```

Resultado esperado: `Server running on port 3001`

Detener con Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/ocr.route.ts server/src/routes/bills.route.ts server/src/index.ts
git commit -m "feat: add Express server with OCR and bills routes"
```

---

## Task 6: Frontend — BillContext y API client

**Files:**
- Create: `client/src/context/BillContext.tsx`
- Create: `client/src/api/client.ts`

- [ ] **Step 1: Crear client/src/api/client.ts**

```typescript
import type { SavedBill } from '../types'

export interface OcrResponse {
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
    isPotentialAlcohol: boolean
  }>
  detectedTipPercentage: number | null
}

export async function ocrReceipt(imageBase64: string, mediaType: string): Promise<OcrResponse> {
  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mediaType }),
  })
  if (!res.ok) throw new Error('OCR failed')
  return res.json()
}

export async function saveBillToServer(billData: object): Promise<{ billId: string }> {
  const res = await fetch('/api/bills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(billData),
  })
  if (!res.ok) throw new Error('Failed to save bill')
  return res.json()
}

export async function getBillFromServer(billId: string): Promise<SavedBill> {
  const res = await fetch(`/api/bills/${billId}`)
  if (!res.ok) throw new Error('Bill not found')
  return res.json()
}
```

- [ ] **Step 2: Crear client/src/context/BillContext.tsx**

```typescript
import { createContext, useContext, useState, ReactNode } from 'react'
import type { BillState, Item, Person } from '../types'

const AVATAR_COLORS = [
  '#FF5F5F', '#2EE59D', '#47D1FF', '#FFB347', '#C27AFF', '#FF85C2',
  '#4DB8FF', '#FFD700', '#98FF98', '#FF6B6B',
]

interface BillContextValue extends BillState {
  setItems: (items: Item[]) => void
  addItem: (item: Omit<Item, 'id' | 'assignedTo'>) => void
  updateItem: (id: string, changes: Partial<Item>) => void
  removeItem: (id: string) => void
  addPerson: (name: string) => void
  removePerson: (id: string) => void
  setTipPercentage: (pct: number) => void
  toggleAssignment: (itemId: string, personId: string) => void
  setRawImage: (base64: string) => void
  resetBill: () => void
}

const BillContext = createContext<BillContextValue | null>(null)

const initialState: BillState = {
  items: [],
  people: [],
  tipPercentage: 0,
}

export function BillProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BillState>(initialState)

  const setItems = (items: Item[]) => setState(s => ({ ...s, items }))

  const addItem = (item: Omit<Item, 'id' | 'assignedTo'>) =>
    setState(s => ({
      ...s,
      items: [...s.items, { ...item, id: crypto.randomUUID(), assignedTo: [] }],
    }))

  const updateItem = (id: string, changes: Partial<Item>) =>
    setState(s => ({
      ...s,
      items: s.items.map(i => (i.id === id ? { ...i, ...changes } : i)),
    }))

  const removeItem = (id: string) =>
    setState(s => ({ ...s, items: s.items.filter(i => i.id !== id) }))

  const addPerson = (name: string) => {
    setState(s => {
      const color = AVATAR_COLORS[s.people.length % AVATAR_COLORS.length]
      return {
        ...s,
        people: [...s.people, { id: crypto.randomUUID(), name, color }],
      }
    })
  }

  const removePerson = (personId: string) =>
    setState(s => ({
      ...s,
      people: s.people.filter(p => p.id !== personId),
      items: s.items.map(i => ({
        ...i,
        assignedTo: i.assignedTo.filter(id => id !== personId),
      })),
    }))

  const setTipPercentage = (tipPercentage: number) =>
    setState(s => ({ ...s, tipPercentage }))

  const toggleAssignment = (itemId: string, personId: string) =>
    setState(s => ({
      ...s,
      items: s.items.map(item => {
        if (item.id !== itemId) return item
        const already = item.assignedTo.includes(personId)
        return {
          ...item,
          assignedTo: already
            ? item.assignedTo.filter(id => id !== personId)
            : [...item.assignedTo, personId],
        }
      }),
    }))

  const setRawImage = (rawReceiptImageBase64: string) =>
    setState(s => ({ ...s, rawReceiptImageBase64 }))

  const resetBill = () => setState(initialState)

  return (
    <BillContext.Provider
      value={{
        ...state,
        setItems,
        addItem,
        updateItem,
        removeItem,
        addPerson,
        removePerson,
        setTipPercentage,
        toggleAssignment,
        setRawImage,
        resetBill,
      }}
    >
      {children}
    </BillContext.Provider>
  )
}

export function useBill(): BillContextValue {
  const ctx = useContext(BillContext)
  if (!ctx) throw new Error('useBill must be used inside BillProvider')
  return ctx
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/context/BillContext.tsx client/src/api/client.ts
git commit -m "feat: add BillContext state management and API client"
```

---

## Task 7: Frontend — App router + componentes base

**Files:**
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/components/BottomNav.tsx`
- Create: `client/src/components/PersonAvatar.tsx`
- Create: `client/src/components/AlcoholChip.tsx`
- Create: `client/src/components/TipSelector.tsx`
- Create: `client/src/index.css`

- [ ] **Step 1: Crear client/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply font-sans bg-surface text-on-surface;
    max-width: 430px;
    margin: 0 auto;
    min-height: 100vh;
  }
}
```

- [ ] **Step 2: Crear client/src/main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 3: Crear client/src/App.tsx**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BillProvider } from './context/BillContext'
import HomePage from './pages/HomePage'
import ReviewPage from './pages/ReviewPage'
import AssignPage from './pages/AssignPage'
import SummaryPage from './pages/SummaryPage'
import SharePage from './pages/SharePage'

export default function App() {
  return (
    <BillProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/assign" element={<AssignPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/share/:billId" element={<SharePage />} />
        </Routes>
      </BrowserRouter>
    </BillProvider>
  )
}
```

- [ ] **Step 4: Crear client/src/components/BottomNav.tsx**

```typescript
import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/', label: 'Upload', icon: '↑' },
  { path: '/review', label: 'Review', icon: '☰' },
  { path: '/assign', label: 'Assign', icon: '👤' },
  { path: '/summary', label: 'Summary', icon: '💰' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 flex">
      {tabs.map(tab => {
        const active = location.pathname === tab.path
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex-1 flex flex-col items-center py-3 text-xs font-heading font-semibold transition-colors
              ${active ? 'text-primary' : 'text-gray-400'}`}
          >
            {active ? (
              <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-lg mb-1">
                {tab.icon}
              </span>
            ) : (
              <span className="text-xl mb-1">{tab.icon}</span>
            )}
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 5: Crear client/src/components/PersonAvatar.tsx**

```typescript
interface PersonAvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md'
  selected?: boolean
  onClick?: () => void
}

export default function PersonAvatar({
  name, color, size = 'md', selected = false, onClick
}: PersonAvatarProps) {
  const initials = name.slice(0, 1).toUpperCase()
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-11 h-11 text-sm'

  return (
    <button
      onClick={onClick}
      className={`rounded-full flex items-center justify-center font-heading font-bold text-white relative flex-shrink-0
        ${sizeClass} ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${selected ? 'ring-2 ring-offset-1 ring-secondary' : ''}`}
      style={{ backgroundColor: color }}
    >
      {initials}
      {selected && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-secondary rounded-full flex items-center justify-center">
          <span className="text-white text-[10px]">✓</span>
        </span>
      )}
    </button>
  )
}
```

- [ ] **Step 6: Crear client/src/components/AlcoholChip.tsx**

```typescript
interface AlcoholChipProps {
  confirmed: boolean
  onConfirm: () => void
  onDeny: () => void
}

export default function AlcoholChip({ confirmed, onConfirm, onDeny }: AlcoholChipProps) {
  if (confirmed) {
    return (
      <button
        onClick={onDeny}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold"
      >
        🍺 Licor
      </button>
    )
  }

  return (
    <button
      onClick={onConfirm}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold border border-orange-300"
    >
      ¿Licor?
    </button>
  )
}
```

- [ ] **Step 7: Crear client/src/components/TipSelector.tsx**

```typescript
interface TipSelectorProps {
  value: number
  onChange: (pct: number) => void
}

const OPTIONS = [0, 10, 15, 20]

export default function TipSelector({ value, onChange }: TipSelectorProps) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map(pct => (
        <button
          key={pct}
          onClick={() => onChange(pct)}
          className={`flex-1 py-2.5 rounded-full text-sm font-heading font-semibold border-2 transition-colors
            ${value === pct
              ? 'border-primary bg-primary text-white'
              : 'border-gray-200 bg-white text-on-surface'
            }`}
        >
          {pct === 0 ? 'None' : `${pct}%`}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 8: Verificar que el cliente compila**

```bash
npm run build --prefix client
```

Resultado esperado: compilación sin errores (habrá warnings por páginas vacías — normal).

- [ ] **Step 9: Commit**

```bash
git add client/src/main.tsx client/src/App.tsx client/src/index.css client/src/components/
git commit -m "feat: add app router and base UI components"
```

---

## Task 8: HomePage

**Files:**
- Create: `client/src/pages/HomePage.tsx`

- [ ] **Step 1: Crear client/src/pages/HomePage.tsx**

```typescript
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ocrReceipt } from '../api/client'
import { useBill } from '../context/BillContext'
import BottomNav from '../components/BottomNav'

export default function HomePage() {
  const navigate = useNavigate()
  const { setItems, setRawImage, resetBill } = useBill()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const base64 = await fileToBase64(file)
    const mediaType = file.type as 'image/jpeg' | 'image/png'
    setRawImage(base64)

    try {
      const result = await ocrReceipt(base64, mediaType)
      setItems(
        result.items.map(i => ({
          id: crypto.randomUUID(),
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
          isPotentialAlcohol: i.isPotentialAlcohol,
          isAlcohol: false,
          assignedTo: [],
        }))
      )
      navigate('/review')
    } catch (err) {
      alert('No se pudo leer la factura. Intenta de nuevo o usa entrada manual.')
    }
  }

  const handleNewBill = () => {
    resetBill()
    navigate('/review')
  }

  return (
    <div className="flex flex-col min-h-screen pb-20 px-5">
      <header className="flex items-center justify-between pt-10 pb-6">
        <div className="flex items-center gap-2">
          <span className="text-primary text-xl">✕</span>
          <span className="font-heading font-bold text-xl text-on-surface">SplitEat</span>
        </div>
      </header>

      <h1 className="font-heading font-bold text-3xl text-on-surface mb-1">
        Welcome to SplitEat!
      </h1>
      <p className="text-on-surface-variant mb-6">Let's split that bill easily.</p>

      {/* Scan Bill */}
      <button
        onClick={() => cameraInputRef.current?.click()}
        className="w-full bg-primary-dark rounded-2xl p-6 text-left text-white mb-3"
      >
        <div className="text-3xl mb-2">📷</div>
        <div className="font-heading font-bold text-xl">Scan Bill</div>
        <div className="text-sm opacity-80">Auto-detect items &amp; prices</div>
      </button>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <div className="flex gap-3 mb-8">
        {/* Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-gray-100 rounded-2xl p-5 flex flex-col items-center gap-2 text-primary"
        >
          <span className="text-2xl">☁️</span>
          <span className="font-heading font-semibold text-sm">Upload Photos</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {/* Manual Entry */}
        <button
          onClick={handleNewBill}
          className="flex-1 bg-secondary rounded-2xl p-5 flex flex-col items-center gap-2 text-on-surface"
        >
          <span className="text-2xl">✏️</span>
          <span className="font-heading font-semibold text-sm">Manual Entry</span>
        </button>
      </div>

      <BottomNav />
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
  })
}
```

- [ ] **Step 2: Verificar en el navegador**

```bash
npm run dev
```

Abrir `http://localhost:5173` (o el puerto que Vite indique) en devtools con vista mobile (iPhone 12 Pro).
Verificar: logo, botones Scan/Upload/Manual, navegación inferior visible.

- [ ] **Step 3: Agregar Recent Receipts con localStorage**

Al final de `HomePage.tsx`, antes del `return`, agregar:

```typescript
// Cargar recientes del localStorage
const recentBills: Array<{ billId: string; date: string; total: string }> =
  JSON.parse(localStorage.getItem('spliteat_recent') || '[]')
```

Y dentro del JSX, después de los 3 botones y antes de `<BottomNav />`, agregar:

```tsx
{recentBills.length > 0 && (
  <div className="mt-4">
    <div className="flex items-center justify-between mb-3">
      <span className="font-heading font-bold text-sm">Recent Receipts</span>
      <button
        onClick={() => { localStorage.removeItem('spliteat_recent'); window.location.reload() }}
        className="text-primary text-xs font-bold uppercase"
      >
        Clear All
      </button>
    </div>
    <div className="flex gap-3 overflow-x-auto pb-2">
      {recentBills.map(b => (
        <a
          key={b.billId}
          href={`/share/${b.billId}`}
          className="flex-shrink-0 w-24 h-24 bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center gap-1 border border-gray-100"
        >
          <span className="text-2xl">🧾</span>
          <span className="text-xs text-gray-500">{b.date}</span>
          <span className="text-xs font-bold text-primary">${b.total}</span>
        </a>
      ))}
    </div>
  </div>
)}
```

Guardar el billId en localStorage desde SummaryPage (en `handleShare`), después de `const { billId } = await saveBillToServer(billData)`:

```typescript
// Guardar en Recent Receipts (máximo 5)
const grandTotal = breakdowns.reduce((s, b) => s + b.total, 0)
const recent = JSON.parse(localStorage.getItem('spliteat_recent') || '[]')
const updated = [
  { billId, date: new Date().toLocaleDateString('es-PA'), total: grandTotal.toFixed(2) },
  ...recent,
].slice(0, 5)
localStorage.setItem('spliteat_recent', JSON.stringify(updated))
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/HomePage.tsx
git commit -m "feat: add home page with camera scan, upload, manual entry and recent receipts"
```

---

## Task 9: ReviewPage

**Files:**
- Create: `client/src/pages/ReviewPage.tsx`

- [ ] **Step 1: Crear client/src/pages/ReviewPage.tsx**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBill } from '../context/BillContext'
import AlcoholChip from '../components/AlcoholChip'
import TipSelector from '../components/TipSelector'
import BottomNav from '../components/BottomNav'

export default function ReviewPage() {
  const navigate = useNavigate()
  const { items, tipPercentage, updateItem, addItem, removeItem, setTipPercentage } = useBill()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newQty, setNewQty] = useState('1')

  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0)

  const handleAddItem = () => {
    const price = parseFloat(newPrice)
    const qty = parseInt(newQty) || 1
    if (!newName || isNaN(price)) return
    addItem({
      name: newName,
      quantity: qty,
      unitPrice: price,
      totalPrice: price * qty,
      isAlcohol: false,
      isPotentialAlcohol: false,
    })
    setNewName('')
    setNewPrice('')
    setNewQty('1')
    setShowAddForm(false)
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 px-5">
      <header className="pt-10 pb-4">
        <h1 className="font-heading font-bold text-2xl">Check the Bill</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Confirma los items. Toca ¿Licor? para marcar bebidas alcohólicas.
        </p>
      </header>

      {/* Items list */}
      <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-heading font-bold text-xs text-primary uppercase tracking-wide">
            Receipt Summary
          </span>
          <span className="text-xs text-gray-400">
            {new Date().toLocaleDateString('es-PA')}
          </span>
        </div>

        {items.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">
            Sin items. Escanea una factura o agrega items manualmente.
          </p>
        )}

        {items.map(item => (
          <div key={item.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-50">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm flex-shrink-0">
              {item.isAlcohol ? '🍺' : '🍔'}
            </div>
            <div className="flex-1 min-w-0">
              <input
                className="font-semibold text-sm w-full bg-transparent outline-none"
                value={item.name}
                onChange={e => updateItem(item.id, { name: e.target.value })}
              />
              <div className="text-xs text-gray-400">Qty: {item.quantity}</div>
              {(item.isPotentialAlcohol || item.isAlcohol) && (
                <div className="mt-1">
                  <AlcoholChip
                    confirmed={item.isAlcohol}
                    onConfirm={() => updateItem(item.id, { isAlcohol: true })}
                    onDeny={() => updateItem(item.id, { isAlcohol: false })}
                  />
                </div>
              )}
              {!item.isPotentialAlcohol && !item.isAlcohol && (
                <button
                  onClick={() => updateItem(item.id, { isPotentialAlcohol: true })}
                  className="text-xs text-gray-300 mt-1"
                >
                  + marcar como licor
                </button>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">$</span>
                <input
                  className="font-bold text-primary text-sm w-16 text-right bg-transparent outline-none"
                  value={item.totalPrice.toFixed(2)}
                  onChange={e => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val)) updateItem(item.id, { totalPrice: val, unitPrice: val / item.quantity })
                  }}
                />
              </div>
              <button onClick={() => removeItem(item.id)} className="text-red-300 text-xs">✕</button>
            </div>
          </div>
        ))}

        {/* Totals */}
        <div className="px-4 py-3 space-y-1">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2">
            <span>Items Total</span>
            <span className="text-primary">${subtotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400">
            * Los impuestos se calculan al asignar (7% comida / 10% licor)
          </p>
        </div>
      </div>

      {/* Add item form */}
      {showAddForm ? (
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <h3 className="font-heading font-semibold text-sm mb-3">Agregar item</h3>
          <input
            className="w-full border border-gray-200 rounded-full px-4 py-2 text-sm mb-2 focus:border-primary outline-none"
            placeholder="Nombre del item"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:border-primary outline-none"
              placeholder="Precio ($)"
              type="number"
              step="0.01"
              value={newPrice}
              onChange={e => setNewPrice(e.target.value)}
            />
            <input
              className="w-20 border border-gray-200 rounded-full px-4 py-2 text-sm focus:border-primary outline-none"
              placeholder="Cant."
              type="number"
              min="1"
              value={newQty}
              onChange={e => setNewQty(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-2 rounded-full border-2 border-gray-200 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddItem}
              className="flex-1 py-2 rounded-full bg-primary text-white text-sm font-semibold"
            >
              Agregar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 rounded-full border-2 border-dashed border-gray-200 text-primary text-sm font-semibold mb-4"
        >
          + Add Item Manually
        </button>
      )}

      {/* Tip selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <h3 className="font-heading font-semibold text-sm mb-3">Add a Group Tip?</h3>
        <TipSelector value={tipPercentage} onChange={setTipPercentage} />
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate('/assign')}
        disabled={items.length === 0}
        className="w-full py-4 rounded-full bg-primary-dark text-white font-heading font-bold text-base disabled:opacity-40"
      >
        NEXT: ASSIGN PEOPLE →
      </button>

      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2: Verificar manualmente en el navegador**

Con `npm run dev` activo, navegar a `http://localhost:5173/review`.

Verificar:
- La lista de items está vacía inicialmente
- El formulario "Add Item Manually" funciona (agregar "Burger" $15 qty 1)
- El chip "¿Licor?" aparece al marcar un item
- El TipSelector cambia entre None/10%/15%/20%
- El botón "NEXT" está deshabilitado con 0 items y habilitado con al menos 1

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/ReviewPage.tsx
git commit -m "feat: add review page with item editing and alcohol flagging"
```

---

## Task 10: AssignPage

**Files:**
- Create: `client/src/pages/AssignPage.tsx`

- [ ] **Step 1: Crear client/src/pages/AssignPage.tsx**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBill } from '../context/BillContext'
import PersonAvatar from '../components/PersonAvatar'
import BottomNav from '../components/BottomNav'

export default function AssignPage() {
  const navigate = useNavigate()
  const { items, people, addPerson, removePerson, toggleAssignment } = useBill()
  const [newName, setNewName] = useState('')
  const [showInput, setShowInput] = useState(false)

  const allAssigned = items.length > 0 && items.every(i => i.assignedTo.length > 0)
  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0)

  const handleAddPerson = () => {
    if (!newName.trim()) return
    addPerson(newName.trim())
    setNewName('')
    setShowInput(false)
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 px-5">
      <header className="pt-10 pb-4 flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl">Who's eating?</h1>
        <span className="text-primary font-semibold text-sm">{people.length} People</span>
      </header>

      {/* People row */}
      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          {showInput ? (
            <div className="flex gap-1">
              <input
                autoFocus
                className="w-20 border border-primary rounded-full px-2 py-1 text-xs outline-none"
                placeholder="Nombre"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPerson()}
              />
              <button onClick={handleAddPerson} className="text-primary text-xs font-bold">OK</button>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="w-11 h-11 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xl"
            >
              +
            </button>
          )}
          <span className="text-xs text-gray-400">Add</span>
        </div>

        {people.map(person => (
          <div key={person.id} className="flex flex-col items-center gap-1 flex-shrink-0">
            <PersonAvatar
              name={person.name}
              color={person.color}
              onClick={() => removePerson(person.id)}
            />
            <span className="text-xs text-on-surface-variant">{person.name}</span>
          </div>
        ))}
      </div>

      <p className="text-on-surface-variant text-sm mb-4">Tap to assign items</p>

      {/* Items */}
      <div className="space-y-3 mb-6">
        {items.map(item => (
          <div
            key={item.id}
            className={`bg-white rounded-2xl p-4 shadow-sm ${
              item.assignedTo.length > 0 ? 'border-2 border-secondary' : 'border-2 border-gray-100'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-sm">{item.name}</div>
                <div className="text-xs text-gray-400">
                  {item.isAlcohol ? '🍺 Bebida alcohólica' : 'Comida / bebida'}
                </div>
              </div>
              <span className="font-bold text-primary">${item.totalPrice.toFixed(2)}</span>
            </div>

            {people.length === 0 && (
              <p className="text-xs text-gray-400">Agrega personas arriba para asignar</p>
            )}

            <div className="flex gap-2 flex-wrap">
              {people.map(person => (
                <div key={person.id} className="flex flex-col items-center gap-0.5">
                  <PersonAvatar
                    name={person.name}
                    color={person.color}
                    size="sm"
                    selected={item.assignedTo.includes(person.id)}
                    onClick={() => toggleAssignment(item.id, person.id)}
                  />
                  <span className="text-[10px] text-gray-400">{person.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer total */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5">
        <div className="bg-white rounded-2xl shadow-md px-4 py-3 flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-on-surface-variant">
            All items: ${subtotal.toFixed(2)}
          </span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-tertiary" />
            <div className="w-3 h-3 rounded-full bg-primary" />
          </div>
        </div>
        <button
          onClick={() => navigate('/summary')}
          disabled={!allAssigned || people.length === 0}
          className="w-full py-4 rounded-full bg-primary text-white font-heading font-bold text-base disabled:opacity-40"
        >
          Final Summary →
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2: Verificar en el navegador**

Navegar a `http://localhost:5173/assign`.

Verificar:
- Se pueden agregar personas (aparecen con avatar de color)
- Tocar el avatar de una persona en un item la selecciona/deselecciona (aparece checkmark verde)
- El botón "Final Summary" está deshabilitado hasta que todos los items tienen al menos 1 persona asignada

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/AssignPage.tsx
git commit -m "feat: add assign page with person management and item assignment"
```

---

## Task 11: SummaryPage

**Files:**
- Create: `client/src/pages/SummaryPage.tsx`

- [ ] **Step 1: Crear client/src/pages/SummaryPage.tsx**

```typescript
import { useState } from 'react'
import { useBill } from '../context/BillContext'
import { calculatePersonBreakdown, calculateAllBreakdowns, validateBillTotal } from '../lib/taxCalculator'
import { saveBillToServer } from '../api/client'
import PersonAvatar from '../components/PersonAvatar'
import BottomNav from '../components/BottomNav'
import type { SavedBill } from '../types'

export default function SummaryPage() {
  const { items, people, tipPercentage } = useBill()
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [sharing, setSharing] = useState(false)

  const breakdowns = calculateAllBreakdowns(people, items, tipPercentage)
  const isValid = validateBillTotal(breakdowns, items, tipPercentage)
  const person = people[selectedIdx]
  const breakdown = breakdowns[selectedIdx]

  if (!person || !breakdown) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
        <p className="text-on-surface-variant">No hay personas asignadas.</p>
        <BottomNav />
      </div>
    )
  }

  const myItems = items.filter(i => i.assignedTo.includes(person.id))

  const handleShare = async () => {
    setSharing(true)
    try {
      const billData: SavedBill = { items, people, tipPercentage, breakdowns }
      const { billId } = await saveBillToServer(billData)
      const shareUrl = `${window.location.origin}/share/${billId}`
      const text = `Aquí está el resumen de nuestra cuenta 🍽️: ${shareUrl}`
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } catch {
      alert('No se pudo generar el link. Verifica tu conexión.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 px-5">
      {/* Person selector */}
      <div className="pt-10 pb-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {people.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => setSelectedIdx(idx)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 transition-opacity ${
                idx === selectedIdx ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <PersonAvatar name={p.name} color={p.color} selected={idx === selectedIdx} />
              <span className="text-xs font-semibold">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Person total */}
      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-1">{person.name}'s Summary</h2>
        <p className="text-on-surface-variant text-sm mb-3">Review your share of the bill</p>
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total to Pay</div>
        <div className="font-heading font-bold text-4xl text-secondary">
          ${breakdown.total.toFixed(2)}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl shadow-sm mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-heading font-bold text-sm">Items Ordered</span>
          <span className="text-xs text-gray-400">{myItems.length} items</span>
        </div>
        {myItems.map(item => {
          const share = item.totalPrice / item.assignedTo.length
          return (
            <div key={item.id} className="flex justify-between items-start px-4 py-3 border-b border-gray-50">
              <div>
                <div className="font-semibold text-sm">{item.name}</div>
                <div className="text-xs text-gray-400">
                  {item.assignedTo.length > 1
                    ? `Compartido con ${item.assignedTo.length - 1} más`
                    : item.isAlcohol ? '10% impuesto' : '7% ITBMS'}
                </div>
              </div>
              <span className="font-bold text-primary text-sm">${share.toFixed(2)}</span>
            </div>
          )
        })}

        {/* Breakdown */}
        <div className="px-4 py-3 space-y-1 bg-gray-50 rounded-b-2xl">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>${(breakdown.foodSubtotal + breakdown.alcoholSubtotal).toFixed(2)}</span>
          </div>
          {breakdown.foodTax > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>ITBMS (7% comida)</span>
              <span>${breakdown.foodTax.toFixed(2)}</span>
            </div>
          )}
          {breakdown.alcoholTax > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Impuesto licor (10%)</span>
              <span>${breakdown.alcoholTax.toFixed(2)}</span>
            </div>
          )}
          {breakdown.tipShare > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Propina ({tipPercentage}%)</span>
              <span>${breakdown.tipShare.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
            <span>Final Total</span>
            <span className="text-secondary">${breakdown.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {!isValid && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-600">
          ⚠️ La suma de los totales no cuadra con el total de la factura. Revisa los items asignados.
        </div>
      )}

      {/* Share */}
      <button
        onClick={handleShare}
        disabled={sharing}
        className="w-full py-4 rounded-full bg-primary text-white font-heading font-bold text-base mb-3 disabled:opacity-60"
      >
        {sharing ? 'Generando link...' : '↗ Share Summary Link'}
      </button>

      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 2: Verificar en el navegador**

Con datos en el contexto (agrega items en /review, personas y asignaciones en /assign), navegar a `/summary`.

Verificar:
- Se puede cambiar entre personas con el selector de avatares
- Los totales cambian correctamente al seleccionar distintas personas
- El desglose muestra ITBMS 7% para comida y 10% para licor por separado
- El botón "Share Summary Link" intenta llamar al backend

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/SummaryPage.tsx
git commit -m "feat: add summary page with per-person breakdown and WhatsApp sharing"
```

---

## Task 12: SharePage (página pública)

**Files:**
- Create: `client/src/pages/SharePage.tsx`

- [ ] **Step 1: Crear client/src/pages/SharePage.tsx**

```typescript
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getBillFromServer } from '../api/client'
import { calculateAllBreakdowns } from '../lib/taxCalculator'
import type { SavedBill } from '../types'

export default function SharePage() {
  const { billId } = useParams<{ billId: string }>()
  const [bill, setBill] = useState<SavedBill | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!billId) return
    getBillFromServer(billId)
      .then(data => setBill(data as SavedBill))
      .catch(() => setError(true))
  }, [billId])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
        <div className="text-4xl mb-4">🍽️</div>
        <h1 className="font-heading font-bold text-xl mb-2">Factura no encontrada</h1>
        <p className="text-on-surface-variant text-sm">Este link ya no está disponible.</p>
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-2">🍽️</div>
          <p className="text-on-surface-variant">Cargando resumen...</p>
        </div>
      </div>
    )
  }

  const breakdowns = bill.breakdowns ?? calculateAllBreakdowns(bill.people, bill.items, bill.tipPercentage)
  const grandTotal = breakdowns.reduce((s, b) => s + b.total, 0)

  return (
    <div className="flex flex-col min-h-screen px-5 pb-10">
      <header className="pt-8 pb-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-primary text-xl">✕</span>
          <span className="font-heading font-bold text-xl">SplitEat</span>
        </div>
        <h1 className="font-heading font-bold text-2xl">Resumen de la cuenta</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Total general: <strong className="text-primary">${grandTotal.toFixed(2)}</strong>
        </p>
      </header>

      {/* All items */}
      <div className="bg-white rounded-2xl shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="font-heading font-bold text-sm">Todos los items</span>
        </div>
        {bill.items.map(item => (
          <div key={item.id} className="flex justify-between px-4 py-2.5 border-b border-gray-50 text-sm">
            <div>
              <span>{item.name}</span>
              {item.isAlcohol && <span className="ml-1 text-xs text-orange-500">🍺</span>}
              <span className="text-gray-400 text-xs ml-2">×{item.quantity}</span>
            </div>
            <span className="font-semibold text-primary">${item.totalPrice.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Per-person breakdown */}
      <h2 className="font-heading font-bold text-lg mb-3">Por persona</h2>
      <div className="space-y-3">
        {bill.people.map((person, idx) => {
          const bd = breakdowns[idx]
          if (!bd) return null
          const myItems = bill.items.filter(i => i.assignedTo.includes(person.id))

          return (
            <div key={person.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: person.color }}
                >
                  {person.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="font-heading font-semibold text-sm">{person.name}</span>
                <span className="ml-auto font-bold text-secondary">${bd.total.toFixed(2)}</span>
              </div>
              {myItems.map(item => (
                <div key={item.id} className="flex justify-between px-4 py-2 text-xs text-gray-600 border-b border-gray-50">
                  <span>{item.name} {item.assignedTo.length > 1 ? `(÷${item.assignedTo.length})` : ''}</span>
                  <span>${(item.totalPrice / item.assignedTo.length).toFixed(2)}</span>
                </div>
              ))}
              <div className="px-4 py-2 bg-gray-50 rounded-b-2xl text-xs text-gray-500 space-y-0.5">
                {bd.foodTax > 0 && <div className="flex justify-between"><span>ITBMS 7%</span><span>+${bd.foodTax.toFixed(2)}</span></div>}
                {bd.alcoholTax > 0 && <div className="flex justify-between"><span>Licor 10%</span><span>+${bd.alcoholTax.toFixed(2)}</span></div>}
                {bd.tipShare > 0 && <div className="flex justify-between"><span>Propina</span><span>+${bd.tipShare.toFixed(2)}</span></div>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center mt-8 text-xs text-gray-400">
        Generado con SplitEat 🍽️
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar la SharePage end-to-end**

1. Completar el flujo completo: Home → Review (agregar items) → Assign (agregar personas) → Summary.
2. En Summary, hacer click en "Share Summary Link" — esto guarda en el backend y abre WhatsApp.
3. Copiar el billId del log del servidor (`POST /api/bills` → `{ billId: "..." }`).
4. Abrir `http://localhost:5173/share/{billId}` en una ventana incógnita (sin sesión).
5. Verificar: muestra todos los items, el desglose por persona, y los totales correctos.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/SharePage.tsx
git commit -m "feat: add public share page for bill summaries"
```

---

## Task 13: README y configuración final

**Files:**
- Create: `README.md`
- Modify: `client/src/api/client.ts` — corregir import duplicado

- [ ] **Step 1: Crear README.md**

```markdown
# SplitEat

Web app para dividir cuentas de restaurante en Panamá con impuestos correctos (7% ITBMS / 10% licor).

## Cómo ejecutar

```bash
npm run dev
```

Abre `http://localhost:5173` en el navegador (vista mobile recomendada).

## Configuración requerida

1. Copia `server/.env.example` → `server/.env`
2. Agrega tu `ANTHROPIC_API_KEY` en `server/.env`

## Flujo de la app

1. **Scan/Upload** — Toma foto de la factura o súbela
2. **Review** — Verifica los items, marca los licores, elige la propina
3. **Assign** — Agrega personas y asigna cada item
4. **Summary** — Ve el total de cada persona y comparte por WhatsApp

## Impuestos (Panamá)

- Comida y bebidas sin alcohol: **7% ITBMS**
- Bebidas alcohólicas: **10%**
- Propina: proporcional al subtotal de cada persona
```

- [ ] **Step 2: Corregir el import erróneo en client/src/api/client.ts**

Abrir `client/src/api/client.ts` y eliminar la primera línea si dice `import type { OcrResult } from './types'` — ese tipo no existe en ese path. El archivo debería importar de `'../types'` si es necesario, pero el `OcrResponse` está definido localmente en el mismo archivo.

Versión correcta del encabezado del archivo (sin el import inválido):

```typescript
import type { SavedBill } from '../types'

export interface OcrResponse {
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
    isPotentialAlcohol: boolean
  }>
  detectedTipPercentage: number | null
}
// ... resto del archivo igual
```

- [ ] **Step 3: Verificar que todos los tests pasan**

```bash
npm test --prefix server
npm test --prefix client
```

Resultado esperado: todos los tests en **PASS**.

- [ ] **Step 4: Verificar que el build de producción compila**

```bash
npm run build --prefix client
npm run build --prefix server
```

Resultado esperado: sin errores TypeScript.

- [ ] **Step 5: Commit final**

```bash
git add README.md client/src/api/client.ts
git commit -m "docs: add README with setup instructions and execution command"
```

---

## Verificación end-to-end

1. `npm run dev` — servidor en :3001, cliente en :5173
2. Abrir `http://localhost:5173` en Chrome DevTools → iPhone 12 Pro (390px)
3. **Flujo golden path:**
   - Tomar foto de una factura real (o subir una imagen)
   - Verificar que los items aparecen en Review; confirmar "Cerveza Balboa" como licor
   - Agregar 3 personas: Ana, Beto, Cris
   - Asignar la cerveza a todos; los demás items distribuirlos
   - Verificar que Ana (solo comida) paga 7% y Beto (comida + cerveza) paga 7% en comida + 10% en licor
   - Generar link → verificar que abre WhatsApp
   - Abrir el link en ventana incógnita → debe mostrar el resumen completo
4. **Edge cases:**
   - Item compartido por 2 personas → cada una paga la mitad
   - 0% propina → la columna propina no aparece
   - Factura con solo licor → todos pagan 10%
   - Link inválido `/share/nonexistent` → muestra "Factura no encontrada"

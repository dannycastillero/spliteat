# Short Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar las URLs de WhatsApp con UUID largo (`/share/a7b3...`) por short links de 6 caracteres (`/s/abc123`).

**Architecture:** Se agrega `short_code CHAR(6) UNIQUE` a la tabla `bills` de Supabase. `api/bills.ts` genera el código al crear la factura con reintentos en caso de colisión. Una nueva serverless function `api/s/[code].ts` resuelve el bill por código. `SharePage` maneja la nueva ruta `/s/:code` además de las existentes.

**Tech Stack:** @supabase/supabase-js (server-side), Vitest (tests), React Router, TypeScript.

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `api/bills.ts` | Modificar | Generar short_code, retornar `{ billId, shortCode }` |
| `api/bills.test.ts` | Modificar | Actualizar mocks y assertions para incluir shortCode |
| `api/s/[code].ts` | Crear | GET /api/s/:code — resolver bill por short_code |
| `api/s/[code].test.ts` | Crear | Tests para el nuevo endpoint |
| `client/src/api/client.ts` | Modificar | Actualizar tipo de retorno de `saveBillToServer`, agregar `getBillByCode` |
| `client/src/api/client.test.ts` | Modificar | Actualizar mock + agregar tests para `getBillByCode` |
| `client/src/pages/SummaryPage.tsx` | Modificar | Usar `shortCode` para construir `shareUrl` |
| `client/src/pages/SharePage.tsx` | Modificar | Manejar ruta `/s/:code` además de `/share/:billId` y `?d=` |
| `client/src/App.tsx` | Modificar | Agregar ruta `/s/:code`, ocultar TopBar en `/s/` |

---

## Task 1: Migración en Supabase (manual — sin código)

**Files:** Ninguno (SQL en Supabase dashboard)

- [ ] **Step 1: Ejecutar la migración en Supabase**

  Ir a https://supabase.com → tu proyecto → SQL Editor → New query. Pegar y ejecutar:

  ```sql
  ALTER TABLE bills ADD COLUMN short_code CHAR(6) NOT NULL DEFAULT '';
  ALTER TABLE bills ADD CONSTRAINT bills_short_code_unique UNIQUE (short_code);
  CREATE INDEX idx_bills_short_code ON bills(short_code);
  ```

- [ ] **Step 2: Verificar en Table Editor**

  Ir a Table Editor → tabla `bills`. Confirmar que aparece la columna `short_code`.

---

## Task 2: Actualizar api/bills.ts con short_code

**Files:**
- Modify: `api/bills.ts`
- Modify: `api/bills.test.ts`

- [ ] **Step 1: Actualizar api/bills.test.ts**

  Reemplazar el contenido completo de `api/bills.test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest'

  const mockInsert = vi.fn()
  const mockSelect = vi.fn()
  const mockSingle = vi.fn()
  const mockGetUser = vi.fn()

  vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn(() => ({
        insert: mockInsert.mockReturnThis(),
        select: mockSelect.mockReturnThis(),
        single: mockSingle,
      })),
    })),
  }))

  import handler from './bills'

  function makeReq(overrides: Record<string, any> = {}) {
    return {
      method: 'POST',
      body: { items: [{ id: '1', name: 'Burger', price: 5 }], people: [{ id: 'p1', name: 'Ana' }] },
      headers: {},
      ...overrides,
    }
  }

  function makeRes() {
    const res: any = {}
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    res.end = vi.fn().mockReturnValue(res)
    return res
  }

  describe('POST /api/bills', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
      mockSingle.mockResolvedValue({ data: { id: 'bill-uuid-123', short_code: 'abc123' }, error: null })
    })

    it('returns 405 for non-POST requests', async () => {
      const req = makeReq({ method: 'GET' })
      const res = makeRes()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(405)
    })

    it('returns 400 when items is missing', async () => {
      const req = makeReq({ body: { people: [] } })
      const res = makeRes()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid bill data: items and people are required' })
    })

    it('returns 400 when people is missing', async () => {
      const req = makeReq({ body: { items: [] } })
      const res = makeRes()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('saves bill anonymously when no Authorization header', async () => {
      const req = makeReq()
      const res = makeRes()
      await handler(req, res)
      expect(res.json).toHaveBeenCalledWith({ billId: 'bill-uuid-123', shortCode: 'abc123' })
      expect(mockGetUser).not.toHaveBeenCalled()
    })

    it('extracts user_id from valid Bearer token', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } })
      const req = makeReq({ headers: { authorization: 'Bearer valid-token' } })
      const res = makeRes()
      await handler(req, res)
      expect(mockGetUser).toHaveBeenCalledWith('valid-token')
      expect(res.json).toHaveBeenCalledWith({ billId: 'bill-uuid-123', shortCode: 'abc123' })
    })

    it('saves anonymously when Bearer token resolves to no user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const req = makeReq({ headers: { authorization: 'Bearer invalid-token' } })
      const res = makeRes()
      await handler(req, res)
      expect(res.json).toHaveBeenCalledWith({ billId: 'bill-uuid-123', shortCode: 'abc123' })
    })

    it('returns 500 when Supabase insert fails with non-collision error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: '42P01', message: 'DB connection failed' } })
      const req = makeReq()
      const res = makeRes()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'DB connection failed' })
    })

    it('retries on short_code collision (23505) and succeeds', async () => {
      mockSingle
        .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'unique violation' } })
        .mockResolvedValueOnce({ data: { id: 'bill-uuid-456', short_code: 'xyz789' }, error: null })
      const req = makeReq()
      const res = makeRes()
      await handler(req, res)
      expect(mockSingle).toHaveBeenCalledTimes(2)
      expect(res.json).toHaveBeenCalledWith({ billId: 'bill-uuid-456', shortCode: 'xyz789' })
    })
  })
  ```

- [ ] **Step 2: Correr los tests para confirmar que fallan**

  ```bash
  npm run test:api
  ```

  Expected: FAIL — varios tests fallan porque la respuesta aún retorna `{ billId }` sin `shortCode`.

- [ ] **Step 3: Reemplazar api/bills.ts**

  Reemplazar el contenido completo de `api/bills.ts`:

  ```typescript
  import { createClient } from '@supabase/supabase-js'

  async function createBillWithRetry(
    supabase: any,
    userId: string | null,
    data: object,
    attempts = 3
  ): Promise<{ id: string; short_code: string }> {
    for (let i = 0; i < attempts; i++) {
      const short_code = Math.random().toString(36).slice(2, 8)
      const { data: bill, error } = await supabase
        .from('bills')
        .insert({ user_id: userId, data, short_code })
        .select('id, short_code')
        .single()
      if (!error) return bill
      if (error.code !== '23505') throw error
    }
    throw new Error('Failed to generate unique short code after 3 attempts')
  }

  export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const billData = req.body
    if (!billData?.items || !billData?.people) {
      return res.status(400).json({ error: 'Invalid bill data: items and people are required' })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let userId: string | null = null
    const authHeader = req.headers.authorization as string | undefined
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id ?? null
    }

    try {
      const bill = await createBillWithRetry(supabase, userId, billData)
      res.json({ billId: bill.id, shortCode: bill.short_code })
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  }
  ```

- [ ] **Step 4: Correr los tests y verificar que pasan**

  ```bash
  npm run test:api
  ```

  Expected: PASS — todos los tests de `api/bills.test.ts` pasan (8 tests).

- [ ] **Step 5: Commit**

  ```bash
  git add api/bills.ts api/bills.test.ts
  git commit -m "feat: add short_code to bills — generate on insert, return in response"
  ```

---

## Task 3: Crear api/s/[code].ts

**Files:**
- Create: `api/s/[code].ts`
- Create: `api/s/[code].test.ts`

- [ ] **Step 1: Crear api/s/[code].test.ts**

  Crear el directorio `api/s/` y el archivo `api/s/[code].test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest'

  const mockEq = vi.fn()
  const mockSelect = vi.fn()
  const mockSingle = vi.fn()

  vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: mockSelect.mockReturnThis(),
        eq: mockEq.mockReturnThis(),
        single: mockSingle,
      })),
    })),
  }))

  import handler from './[code]'

  function makeReq(code = 'abc123') {
    return { method: 'GET', query: { code } }
  }

  function makeRes() {
    const res: any = {}
    res.status = vi.fn().mockReturnValue(res)
    res.json = vi.fn().mockReturnValue(res)
    res.end = vi.fn().mockReturnValue(res)
    return res
  }

  describe('GET /api/s/[code]', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    })

    it('returns 405 for non-GET requests', async () => {
      const req = { ...makeReq(), method: 'POST' }
      const res = makeRes()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(405)
    })

    it('returns bill data when short_code exists', async () => {
      const billData = { items: [], people: [], tipPercentage: 0 }
      mockSingle.mockResolvedValue({ data: { data: billData }, error: null })
      const req = makeReq('abc123')
      const res = makeRes()
      await handler(req, res)
      expect(mockEq).toHaveBeenCalledWith('short_code', 'abc123')
      expect(res.json).toHaveBeenCalledWith(billData)
    })

    it('returns 404 when short_code does not exist', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
      const req = makeReq('notexist')
      const res = makeRes()
      await handler(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: 'Bill not found' })
    })
  })
  ```

- [ ] **Step 2: Correr el test para confirmar que falla**

  ```bash
  npm run test:api
  ```

  Expected: FAIL — `Cannot find module './[code]'`

- [ ] **Step 3: Crear api/s/[code].ts**

  Crear `api/s/[code].ts`:

  ```typescript
  import { createClient } from '@supabase/supabase-js'

  export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { code } = req.query as { code: string }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: bill, error } = await supabase
      .from('bills')
      .select('data')
      .eq('short_code', code)
      .single()

    if (error || !bill) return res.status(404).json({ error: 'Bill not found' })
    res.json(bill.data)
  }
  ```

- [ ] **Step 4: Correr los tests y verificar que pasan**

  ```bash
  npm run test:api
  ```

  Expected: PASS — todos los tests de `api/s/[code].test.ts` pasan (3 tests).

- [ ] **Step 5: Commit**

  ```bash
  git add "api/s/[code].ts" "api/s/[code].test.ts"
  git commit -m "feat: add GET /api/s/:code endpoint to resolve bills by short_code"
  ```

---

## Task 4: Actualizar client/src/api/client.ts

**Files:**
- Modify: `client/src/api/client.ts`
- Modify: `client/src/api/client.test.ts`

- [ ] **Step 1: Actualizar client/src/api/client.test.ts**

  Reemplazar el contenido completo de `client/src/api/client.test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest'

  vi.mock('../lib/supabase', () => ({
    supabase: {
      auth: {
        getSession: vi.fn()
      }
    }
  }))

  import { saveBillToServer, getBillByCode } from './client'
  import { supabase } from '../lib/supabase'

  const mockFetch = vi.fn()
  vi.stubGlobal('fetch', mockFetch)

  describe('saveBillToServer', () => {
    beforeEach(() => {
      mockFetch.mockClear()
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ billId: 'test-uuid', shortCode: 'abc123' })
      })
    })

    it('sends bill data without auth header when no session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null }
      } as any)

      await saveBillToServer({ items: [], people: [] })

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toBeUndefined()
    })

    it('sends Authorization header when session exists', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'my-token' } }
      } as any)

      await saveBillToServer({ items: [], people: [] })

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer my-token')
    })
  })

  describe('getBillByCode', () => {
    beforeEach(() => {
      mockFetch.mockClear()
    })

    it('fetches bill from /api/s/:code', async () => {
      const billData = { items: [], people: [], tipPercentage: 0 }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(billData)
      })
      const result = await getBillByCode('abc123')
      expect(mockFetch).toHaveBeenCalledWith('/api/s/abc123')
      expect(result).toEqual(billData)
    })

    it('throws when bill not found', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      await expect(getBillByCode('notexist')).rejects.toThrow('Bill not found')
    })
  })
  ```

- [ ] **Step 2: Correr los tests para confirmar que fallan**

  ```bash
  cd client && npm test -- client.test
  ```

  Expected: FAIL — `getBillByCode is not exported from './client'`

- [ ] **Step 3: Actualizar client/src/api/client.ts**

  Reemplazar el contenido completo de `client/src/api/client.ts`:

  ```typescript
  import type { SavedBill } from '../types'
  import { supabase } from '../lib/supabase'

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

  export async function saveBillToServer(billData: object): Promise<{ billId: string; shortCode: string }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    const res = await fetch('/api/bills', {
      method: 'POST',
      headers,
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

  export async function getBillByCode(code: string): Promise<SavedBill> {
    const res = await fetch(`/api/s/${code}`)
    if (!res.ok) throw new Error('Bill not found')
    return res.json()
  }
  ```

- [ ] **Step 4: Correr los tests y verificar que pasan**

  ```bash
  cd client && npm test -- client.test
  ```

  Expected: PASS — 4 tests pasan (2 de `saveBillToServer`, 2 de `getBillByCode`).

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/api/client.ts client/src/api/client.test.ts
  git commit -m "feat: add getBillByCode to client API, update saveBillToServer return type"
  ```

---

## Task 5: Actualizar SummaryPage para usar shortCode

**Files:**
- Modify: `client/src/pages/SummaryPage.tsx`

- [ ] **Step 1: Actualizar handleShare en SummaryPage.tsx**

  En `client/src/pages/SummaryPage.tsx`, localizar la función `handleShare` (líneas 34-55) y reemplazarla:

  ```typescript
  const handleShare = async () => {
    setSharing(true)
    try {
      const payload = { items, people, tipPercentage }
      const { shortCode } = await saveBillToServer(payload)
      const shareUrl = `${window.location.origin}/s/${shortCode}`

      const recent = JSON.parse(localStorage.getItem('spliteat_recent') || '[]')
      const updated = [
        { shareUrl, date: new Date().toLocaleDateString('es-PA'), total: grandTotal.toFixed(2) },
        ...recent,
      ].slice(0, 5)
      localStorage.setItem('spliteat_recent', JSON.stringify(updated))

      const text = `Aquí está el resumen de nuestra cuenta 🍽️: ${shareUrl}`
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } catch {
      alert('No se pudo guardar la cuenta. Verifica tu conexión.')
    } finally {
      setSharing(false)
    }
  }
  ```

- [ ] **Step 2: Verificar build**

  ```bash
  cd client && npm run build
  ```

  Expected: sin errores de TypeScript.

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/pages/SummaryPage.tsx
  git commit -m "feat: share URL now uses short link /s/:code instead of UUID"
  ```

---

## Task 6: Actualizar SharePage y App.tsx para la ruta /s/:code

**Files:**
- Modify: `client/src/pages/SharePage.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Actualizar las primeras líneas de SharePage.tsx**

  En `client/src/pages/SharePage.tsx`, reemplazar las primeras 27 líneas (imports + estado + useEffect):

  ```typescript
  import { useEffect, useState } from 'react'
  import { useParams, useSearchParams } from 'react-router-dom'
  import { calculateAllBreakdowns } from '../lib/taxCalculator'
  import { getBillFromServer, getBillByCode } from '../api/client'
  import type { BillState } from '../types'

  export default function SharePage() {
    const { billId, code } = useParams<{ billId?: string; code?: string }>()
    const [searchParams] = useSearchParams()
    const [bill, setBill] = useState<BillState | null>(null)
    const [error, setError] = useState(false)

    useEffect(() => {
      if (code) {
        getBillByCode(code)
          .then(setBill)
          .catch(() => setError(true))
      } else if (billId) {
        getBillFromServer(billId)
          .then(setBill)
          .catch(() => setError(true))
      } else {
        const encoded = searchParams.get('d')
        if (!encoded) { setError(true); return }
        try {
          setBill(JSON.parse(decodeURIComponent(atob(encoded))))
        } catch {
          setError(true)
        }
      }
    }, [billId, code, searchParams])
  ```

  El resto del archivo (desde `if (error) return <ErrorView />` en adelante) no cambia.

- [ ] **Step 2: Actualizar App.tsx**

  En `client/src/App.tsx`, reemplazar el contenido completo:

  ```typescript
  import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
  import { BillProvider } from './context/BillContext'
  import { AuthProvider } from './context/AuthContext'
  import TopBar from './components/TopBar'
  import HomePage from './pages/HomePage'
  import ReviewPage from './pages/ReviewPage'
  import AssignPage from './pages/AssignPage'
  import SummaryPage from './pages/SummaryPage'
  import SharePage from './pages/SharePage'
  import HistoryPage from './pages/HistoryPage'
  import AuthCallbackPage from './pages/AuthCallbackPage'
  import LoginPage from './pages/LoginPage'

  const NO_TOPBAR_EXACT = ['/login', '/auth/callback', '/share']

  function AppRoutes() {
    const { pathname } = useLocation()
    const showTopBar =
      !NO_TOPBAR_EXACT.some(p => pathname === p || pathname.startsWith('/share/')) &&
      !pathname.startsWith('/s/')

    return (
      <>
        {showTopBar && <TopBar />}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/assign" element={<AssignPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/share" element={<SharePage />} />
          <Route path="/share/:billId" element={<SharePage />} />
          <Route path="/s/:code" element={<SharePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
        </Routes>
      </>
    )
  }

  export default function App() {
    return (
      <AuthProvider>
        <BillProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </BillProvider>
      </AuthProvider>
    )
  }
  ```

- [ ] **Step 3: Correr todos los tests del cliente**

  ```bash
  cd client && npm test
  ```

  Expected: PASS — todos los tests existentes siguen pasando.

- [ ] **Step 4: Verificar build completo**

  ```bash
  cd client && npm run build
  ```

  Expected: sin errores de TypeScript.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/SharePage.tsx client/src/App.tsx
  git commit -m "feat: SharePage handles /s/:code route, TopBar hidden on short link pages"
  ```

---

## Notas

**Backward compatibility garantizada:** Las rutas `/share/:billId` (UUID) y `/share?d=...` (base64 legacy) siguen funcionando sin cambios. Solo las facturas nuevas usan `/s/:code`.

**Tests del servidor Express:** Los tests en `server/` no se tocan — no son relevantes para esta feature.

**Verificación manual post-deploy:** Completar el flujo de dividir cuenta → Summary → "Compartir". Verificar que el link de WhatsApp usa `/s/abc123` y que la URL abre el resumen correctamente.

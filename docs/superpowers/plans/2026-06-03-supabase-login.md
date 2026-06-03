# SplitEat v3 — Supabase + Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar SQLite por Supabase en producción, agregar login con magic link, e historial de facturas para usuarios autenticados.

**Architecture:** Dos Vercel serverless functions nuevas (`api/bills.ts`, `api/bills/[billId].ts`) reemplazan el Express server en producción. Supabase Auth maneja el login con magic link. El cliente React agrega AuthContext, LoginModal, TopBar y HistoryPage. SummaryPage cambia de base64-en-URL a billId real de Supabase.

**Tech Stack:** @supabase/supabase-js, Vercel Node.js Runtime (TypeScript), Vitest + React Testing Library (existentes), React Context API.

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `api/bills.ts` | Crear | POST /api/bills — guarda factura en Supabase |
| `api/bills/[billId].ts` | Crear | GET /api/bills/:id — recupera factura de Supabase |
| `client/src/lib/supabase.ts` | Crear | Cliente Supabase singleton (anon key) |
| `client/src/context/AuthContext.tsx` | Crear | Estado global de autenticación |
| `client/src/pages/AuthCallbackPage.tsx` | Crear | Captura sesión post-magic-link |
| `client/src/components/LoginModal.tsx` | Crear | Modal: email + botón enviar magic link |
| `client/src/components/TopBar.tsx` | Crear | Barra superior: botón login / avatar usuario |
| `client/src/pages/HistoryPage.tsx` | Crear | Lista de facturas del usuario autenticado |
| `client/src/api/client.ts` | Modificar | Agregar auth header a `saveBillToServer` |
| `client/src/pages/SummaryPage.tsx` | Modificar | Guardar en servidor → share por billId |
| `client/src/pages/SharePage.tsx` | Modificar | Soporte /share/:billId + backward compat ?d= |
| `client/src/App.tsx` | Modificar | AuthProvider + rutas nuevas |
| `client/package.json` | Modificar | Agregar @supabase/supabase-js |
| `package.json` (raíz) | Modificar | Agregar @supabase/supabase-js para api/ |
| `vercel.json` | Modificar | Actualizar rewrites |
| `client/.env.example` | Modificar | Agregar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY |

---

## Task 1: Supabase project setup (manual — sin código)

**Files:** Ninguno (configuración en Supabase dashboard)

- [ ] **Step 1: Crear proyecto en Supabase**

  Ir a https://supabase.com → "New project". Elegir nombre: `spliteat`. Guardar la contraseña generada. Esperar ~2 minutos a que el proyecto esté listo.

- [ ] **Step 2: Crear tabla bills y configurar RLS**

  En el proyecto de Supabase → "SQL Editor" → "New query". Pegar y ejecutar:

  ```sql
  -- Tabla principal
  CREATE TABLE bills (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    data         JSONB       NOT NULL
  );

  -- Índices
  CREATE INDEX idx_bills_user_id    ON bills(user_id);
  CREATE INDEX idx_bills_created_at ON bills(created_at DESC);

  -- RLS
  ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

  -- Cualquiera puede insertar (anónimos también)
  CREATE POLICY "insert_any" ON bills
    FOR INSERT WITH CHECK (true);

  -- Usuarios autenticados ven solo sus propias facturas
  CREATE POLICY "select_own" ON bills
    FOR SELECT USING (auth.uid() = user_id);

  -- Facturas anónimas son legibles por cualquiera (para compartir por WhatsApp)
  CREATE POLICY "select_anonymous" ON bills
    FOR SELECT USING (user_id IS NULL);
  ```

  Verificar en "Table Editor" que la tabla `bills` aparece.

- [ ] **Step 3: Habilitar magic link en Supabase Auth**

  Authentication → Providers → Email → confirmar que "Enable Email provider" está ON y que "Confirm email" puede estar OFF para magic link (o configurar según preferencia).

- [ ] **Step 4: Configurar redirect URL**

  Authentication → URL Configuration:
  - Site URL: `https://spliteat.vercel.app`
  - Redirect URLs: agregar `https://spliteat.vercel.app/auth/callback`

- [ ] **Step 5: Copiar credenciales**

  Project Settings → API. Copiar y guardar en un lugar seguro:
  - `Project URL` → será `SUPABASE_URL` y `VITE_SUPABASE_URL`
  - `anon public` key → será `SUPABASE_ANON_KEY` y `VITE_SUPABASE_ANON_KEY`
  - `service_role` key → será `SUPABASE_SERVICE_ROLE_KEY` (¡nunca al cliente!)

---

## Task 2: Instalar dependencias

**Files:**
- Modify: `package.json` (raíz)
- Modify: `client/package.json`

- [ ] **Step 1: Agregar @supabase/supabase-js al root package.json**

  Abrir `package.json` en la raíz y reemplazar su contenido con:

  ```json
  {
    "name": "spliteat",
    "private": true,
    "scripts": {
      "dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\""
    },
    "dependencies": {
      "@supabase/supabase-js": "^2.49.0"
    },
    "devDependencies": {
      "concurrently": "^8.2.2"
    }
  }
  ```

- [ ] **Step 2: Instalar en la raíz**

  ```bash
  npm install
  ```

  Expected: `node_modules/@supabase/` aparece en la raíz.

- [ ] **Step 3: Agregar @supabase/supabase-js al client**

  ```bash
  cd client && npm install @supabase/supabase-js
  ```

  Expected: aparece en `client/package.json` bajo `dependencies`.

- [ ] **Step 4: Commit**

  ```bash
  git add package.json package-lock.json client/package.json client/package-lock.json
  git commit -m "chore: add @supabase/supabase-js to root and client"
  ```

---

## Task 3: Crear client/src/lib/supabase.ts

**Files:**
- Create: `client/src/lib/supabase.ts`

- [ ] **Step 1: Crear el archivo**

  ```typescript
  import { createClient } from '@supabase/supabase-js'

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  export const supabase = createClient(supabaseUrl, supabaseAnonKey)
  ```

- [ ] **Step 2: Actualizar client/.env.example**

  Abrir `client/.env.example` y agregar al final:

  ```
  VITE_SUPABASE_URL=https://xxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJ...
  ```

- [ ] **Step 3: Crear client/.env.local con los valores reales**

  Crear `client/.env.local` (ignorado por git) con las credenciales de Supabase:

  ```
  VITE_API_URL=http://localhost:3001
  VITE_SUPABASE_URL=<tu Project URL de Supabase>
  VITE_SUPABASE_ANON_KEY=<tu anon key de Supabase>
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/lib/supabase.ts client/.env.example
  git commit -m "feat: add Supabase client singleton"
  ```

---

## Task 4: Crear AuthContext

**Files:**
- Create: `client/src/context/AuthContext.tsx`
- Create: `client/src/context/AuthContext.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

  Crear `client/src/context/AuthContext.test.tsx`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest'
  import { render, screen, act } from '@testing-library/react'
  import { AuthProvider, useAuth } from './AuthContext'

  vi.mock('../lib/supabase', () => ({
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        }),
        signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      }
    }
  }))

  function TestConsumer() {
    const { user, loading } = useAuth()
    return (
      <div>
        <span data-testid="loading">{String(loading)}</span>
        <span data-testid="user">{user ? user.email : 'anonymous'}</span>
      </div>
    )
  }

  describe('AuthContext', () => {
    it('starts with loading=true then resolves to anonymous user', async () => {
      await act(async () => {
        render(<AuthProvider><TestConsumer /></AuthProvider>)
      })
      expect(screen.getByTestId('loading').textContent).toBe('false')
      expect(screen.getByTestId('user').textContent).toBe('anonymous')
    })
  })
  ```

- [ ] **Step 2: Correr el test para confirmar que falla**

  ```bash
  cd client && npm test -- AuthContext
  ```

  Expected: FAIL con "Cannot find module './AuthContext'"

- [ ] **Step 3: Implementar AuthContext.tsx**

  Crear `client/src/context/AuthContext.tsx`:

  ```typescript
  import { createContext, useContext, useEffect, useState } from 'react'
  import type { User } from '@supabase/supabase-js'
  import { supabase } from '../lib/supabase'

  interface AuthContextType {
    user: User | null
    loading: boolean
    signIn: (email: string) => Promise<void>
    signOut: () => Promise<void>
  }

  const AuthContext = createContext<AuthContextType | null>(null)

  export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })

      return () => subscription.unsubscribe()
    }, [])

    const signIn = async (email: string) => {
      await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      })
    }

    const signOut = async () => {
      await supabase.auth.signOut()
    }

    return (
      <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
        {children}
      </AuthContext.Provider>
    )
  }

  export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
  }
  ```

- [ ] **Step 4: Correr el test y verificar que pasa**

  ```bash
  cd client && npm test -- AuthContext
  ```

  Expected: PASS

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/context/AuthContext.tsx client/src/context/AuthContext.test.tsx
  git commit -m "feat: add AuthContext with Supabase magic link auth"
  ```

---

## Task 5: Crear api/bills.ts (POST)

**Files:**
- Create: `api/bills.ts`

- [ ] **Step 1: Crear el archivo**

  ```typescript
  import { createClient } from '@supabase/supabase-js'

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

    const { data: bill, error } = await supabase
      .from('bills')
      .insert({ user_id: userId, data: billData })
      .select('id')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json({ billId: bill.id })
  }
  ```

- [ ] **Step 2: Verificar que TypeScript no da errores**

  ```bash
  cd client && npx tsc --noEmit
  ```

  (El archivo `api/bills.ts` usa `any` para req/res, no debería dar error. Si el compilador del client no cubre `api/`, está bien — Vercel lo compila en deploy.)

- [ ] **Step 3: Commit**

  ```bash
  git add api/bills.ts
  git commit -m "feat: add POST /api/bills serverless function"
  ```

---

## Task 6: Crear api/bills/[billId].ts (GET)

**Files:**
- Create: `api/bills/[billId].ts`

- [ ] **Step 1: Crear el directorio y archivo**

  ```bash
  mkdir api/bills
  ```

  Crear `api/bills/[billId].ts`:

  ```typescript
  import { createClient } from '@supabase/supabase-js'

  export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { billId } = req.query as { billId: string }
    if (!billId) return res.status(400).json({ error: 'billId is required' })

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: bill, error } = await supabase
      .from('bills')
      .select('data')
      .eq('id', billId)
      .single()

    if (error || !bill) return res.status(404).json({ error: 'Bill not found' })
    res.json(bill.data)
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add "api/bills/[billId].ts"
  git commit -m "feat: add GET /api/bills/:billId serverless function"
  ```

---

## Task 7: Actualizar vercel.json

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Reemplazar vercel.json**

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

- [ ] **Step 2: Commit**

  ```bash
  git add vercel.json
  git commit -m "chore: update vercel.json rewrites for api/bills routes"
  ```

---

## Task 8: Actualizar client/src/api/client.ts

**Files:**
- Modify: `client/src/api/client.ts`
- Create: `client/src/api/client.test.ts`

- [ ] **Step 1: Escribir el test que falla**

  Crear `client/src/api/client.test.ts`:

  ```typescript
  import { describe, it, expect, vi, beforeEach } from 'vitest'

  vi.mock('../lib/supabase', () => ({
    supabase: {
      auth: {
        getSession: vi.fn()
      }
    }
  }))

  import { saveBillToServer } from './client'
  import { supabase } from '../lib/supabase'

  const mockFetch = vi.fn()
  global.fetch = mockFetch

  describe('saveBillToServer', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ billId: 'test-uuid' })
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
  ```

- [ ] **Step 2: Correr el test para confirmar que falla**

  ```bash
  cd client && npm test -- client.test
  ```

  Expected: FAIL porque `saveBillToServer` no incluye auth header todavía.

- [ ] **Step 3: Actualizar client.ts**

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

  export async function saveBillToServer(billData: object): Promise<{ billId: string }> {
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
  ```

- [ ] **Step 4: Correr los tests y verificar que pasan**

  ```bash
  cd client && npm test -- client.test
  ```

  Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/api/client.ts client/src/api/client.test.ts
  git commit -m "feat: include Supabase auth token in saveBillToServer"
  ```

---

## Task 9: Actualizar SummaryPage para guardar en Supabase

**Files:**
- Modify: `client/src/pages/SummaryPage.tsx`

El cambio principal: en vez de codificar los datos en base64 para la URL, llamar a `saveBillToServer` y usar el `billId` retornado.

- [ ] **Step 1: Leer el archivo actual**

  Abrir `client/src/pages/SummaryPage.tsx` y localizar la función `handleShare`. Actualmente:

  ```typescript
  const handleShare = () => {
    setSharing(true)
    try {
      const payload = { items, people, tipPercentage }
      const encoded = btoa(encodeURIComponent(JSON.stringify(payload)))
      const shareUrl = `${window.location.origin}/share?d=${encoded}`
      // guarda en localStorage, abre WhatsApp...
    }
  }
  ```

- [ ] **Step 2: Reemplazar `handleShare` con versión async que guarda en servidor**

  Reemplazar la función `handleShare` y asegurarse de que el import de `saveBillToServer` esté presente:

  Agregar este import al inicio del archivo si no existe:
  ```typescript
  import { saveBillToServer } from '../api/client'
  ```

  Reemplazar la función `handleShare`:

  ```typescript
  const handleShare = async () => {
    setSharing(true)
    try {
      const payload = { items, people, tipPercentage }
      const { billId } = await saveBillToServer(payload)
      const shareUrl = `${window.location.origin}/share/${billId}`

      const recent = JSON.parse(localStorage.getItem('spliteat_recent') || '[]')
      const updated = [
        { shareUrl, date: new Date().toLocaleDateString('es-PA'), total: grandTotal.toFixed(2) },
        ...recent,
      ].slice(0, 5)
      localStorage.setItem('spliteat_recent', JSON.stringify(updated))

      const text = `Aquí está el resumen de nuestra cuenta 🧮: ${shareUrl}`
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } catch {
      alert('No se pudo guardar la cuenta. Verifica tu conexión.')
    } finally {
      setSharing(false)
    }
  }
  ```

  También asegurarse de que el botón que llama a `handleShare` tenga `onClick={handleShare}` (sin cambios si ya lo tiene).

- [ ] **Step 3: Verificar build**

  ```bash
  cd client && npm run build
  ```

  Expected: sin errores de TypeScript.

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/pages/SummaryPage.tsx
  git commit -m "feat: save bill to Supabase in SummaryPage, share via billId URL"
  ```

---

## Task 10: Actualizar SharePage para soporte /share/:billId

**Files:**
- Modify: `client/src/pages/SharePage.tsx`

SharePage debe manejar dos formatos:
1. **Nuevo:** `/share/:billId` → fetch del servidor
2. **Legado:** `/share?d=<base64>` → decode del URL (backward compat)

- [ ] **Step 1: Reemplazar SharePage.tsx**

  Reemplazar el contenido completo de `client/src/pages/SharePage.tsx`:

  ```typescript
  import { useEffect, useState } from 'react'
  import { useParams, useSearchParams } from 'react-router-dom'
  import { calculateAllBreakdowns } from '../lib/taxCalculator'
  import { getBillFromServer } from '../api/client'
  import type { BillState } from '../types'

  export default function SharePage() {
    const { billId } = useParams<{ billId?: string }>()
    const [searchParams] = useSearchParams()
    const [bill, setBill] = useState<BillState | null>(null)
    const [error, setError] = useState(false)

    useEffect(() => {
      if (billId) {
        // Nuevo formato: /share/:billId
        getBillFromServer(billId)
          .then(setBill)
          .catch(() => setError(true))
      } else {
        // Legado: /share?d=<base64>
        const encoded = searchParams.get('d')
        if (!encoded) { setError(true); return }
        try {
          setBill(JSON.parse(decodeURIComponent(atob(encoded))))
        } catch {
          setError(true)
        }
      }
    }, [billId, searchParams])

    if (error) return <ErrorView />
    if (!bill) return <LoadingView />

    const breakdowns = calculateAllBreakdowns(bill.people, bill.items, bill.tipPercentage)
    const grandTotal = breakdowns.reduce((s, b) => s + b.total, 0)
    const billHasAlcohol = bill.items.some(i => i.isAlcohol)

    return (
      <div className="flex flex-col min-h-screen px-5 pb-10">
        <header className="pt-8 pb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-primary text-xl">🍽️</span>
            <span className="font-heading font-bold text-xl">SplitEat</span>
          </div>
          <h1 className="font-heading font-bold text-2xl">Resumen de la cuenta</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Total general: <strong className="text-primary">${grandTotal.toFixed(2)}</strong>
          </p>
        </header>

        <div className="bg-white rounded-2xl shadow-sm mb-6">
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
          <div className="px-4 py-2.5 bg-gray-50 rounded-b-2xl flex justify-between font-bold text-sm">
            <span>Total items</span>
            <span>${bill.items.reduce((s, i) => s + i.totalPrice, 0).toFixed(2)}</span>
          </div>
        </div>

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
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: person.color }}
                  >
                    {person.name[0].toUpperCase()}
                  </div>
                  <span className="font-heading font-semibold text-sm">
                    {person.name}{person.senior ? ' 👴' : ''}
                  </span>
                  <span className="ml-auto font-bold text-secondary">${bd.total.toFixed(2)}</span>
                </div>
                {myItems.map(item => (
                  <div key={item.id} className="flex justify-between px-4 py-2 text-xs text-gray-600 border-b border-gray-50">
                    <span>{item.name}{item.assignedTo.length > 1 ? ` (÷${item.assignedTo.length})` : ''}</span>
                    <span>${(item.totalPrice / item.assignedTo.length).toFixed(2)}</span>
                  </div>
                ))}
                <div className="px-4 py-2 bg-gray-50 rounded-b-2xl text-xs text-gray-500 space-y-0.5">
                  {bd.seniorDiscount > 0 && (
                    <div className="flex justify-between text-amber-600 font-semibold">
                      <span>Descuento jubilado (25%)</span>
                      <span>-${bd.seniorDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {billHasAlcohol && bd.foodTax > 0 && (
                    <div className="flex justify-between"><span>ITBMS 7%</span><span>+${bd.foodTax.toFixed(2)}</span></div>
                  )}
                  {bd.alcoholTax > 0 && (
                    <div className="flex justify-between"><span>Licor 10%</span><span>+${bd.alcoholTax.toFixed(2)}</span></div>
                  )}
                  {bd.tipShare > 0 && (
                    <div className="flex justify-between"><span>Propina ({bill.tipPercentage}%)</span><span>+${bd.tipShare.toFixed(2)}</span></div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="text-center mt-8 text-xs text-gray-400">
          Generado con SplitEat 🍽️🥘
        </div>
      </div>
    )
  }

  function LoadingView() {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
        <div className="text-4xl mb-4">🍽️</div>
        <p className="text-on-surface-variant text-sm">Cargando cuenta...</p>
      </div>
    )
  }

  function ErrorView() {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
        <div className="text-4xl mb-4">🍽️🥘</div>
        <h1 className="font-heading font-bold text-xl mb-2">Link inválido</h1>
        <p className="text-on-surface-variant text-sm">Este link no contiene datos de una cuenta.</p>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verificar build**

  ```bash
  cd client && npm run build
  ```

  Expected: sin errores.

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/pages/SharePage.tsx
  git commit -m "feat: SharePage supports /share/:billId (server) and /share?d= (legacy)"
  ```

---

## Task 11: Crear AuthCallbackPage

**Files:**
- Create: `client/src/pages/AuthCallbackPage.tsx`

Esta página captura la sesión cuando Supabase redirige al usuario después del magic link.

- [ ] **Step 1: Crear el archivo**

  ```typescript
  import { useEffect } from 'react'
  import { useNavigate } from 'react-router-dom'
  import { supabase } from '../lib/supabase'

  export default function AuthCallbackPage() {
    const navigate = useNavigate()

    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          navigate('/history', { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      })
    }, [navigate])

    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
        <div className="text-4xl mb-4">🍽️</div>
        <p className="text-on-surface-variant text-sm">Iniciando sesión...</p>
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add client/src/pages/AuthCallbackPage.tsx
  git commit -m "feat: add AuthCallbackPage for magic link redirect"
  ```

---

## Task 12: Crear LoginModal

**Files:**
- Create: `client/src/components/LoginModal.tsx`

- [ ] **Step 1: Crear el archivo**

  ```typescript
  import { useState } from 'react'
  import { useAuth } from '../context/AuthContext'

  interface LoginModalProps {
    onClose: () => void
  }

  export default function LoginModal({ onClose }: LoginModalProps) {
    const { signIn } = useAuth()
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!email) return
      setLoading(true)
      try {
        await signIn(email)
        setSent(true)
      } catch {
        alert('No se pudo enviar el enlace. Intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={onClose}>
        <div
          className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-10"
          onClick={e => e.stopPropagation()}
        >
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📬</div>
              <h2 className="font-heading font-bold text-xl mb-2">¡Revisa tu email!</h2>
              <p className="text-on-surface-variant text-sm">
                Te enviamos un enlace a <strong>{email}</strong>. Haz click en él para entrar.
              </p>
              <button
                className="mt-6 w-full py-3 rounded-full bg-primary text-white font-semibold"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-heading font-bold text-xl mb-1">Iniciar sesión</h2>
              <p className="text-on-surface-variant text-sm mb-6">
                Ingresa tu email y te enviamos un enlace mágico para entrar.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-full bg-primary text-white font-semibold disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add client/src/components/LoginModal.tsx
  git commit -m "feat: add LoginModal with magic link email form"
  ```

---

## Task 13: Crear TopBar

**Files:**
- Create: `client/src/components/TopBar.tsx`

- [ ] **Step 1: Crear el archivo**

  ```typescript
  import { useState } from 'react'
  import { useNavigate } from 'react-router-dom'
  import { useAuth } from '../context/AuthContext'
  import LoginModal from './LoginModal'

  export default function TopBar() {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const [showLogin, setShowLogin] = useState(false)

    return (
      <>
        <header className="flex items-center justify-between px-5 pt-6 pb-2">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <span className="text-primary">🍽️</span>
            <span className="font-heading font-bold text-lg">SplitEat</span>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <button
                className="text-xs text-on-surface-variant underline"
                onClick={() => navigate('/history')}
              >
                Mis facturas
              </button>
              <button
                className="text-xs text-on-surface-variant"
                onClick={signOut}
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              className="text-sm font-semibold text-primary"
              onClick={() => setShowLogin(true)}
            >
              Iniciar sesión
            </button>
          )}
        </header>

        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add client/src/components/TopBar.tsx
  git commit -m "feat: add TopBar with login/logout and history link"
  ```

---

## Task 14: Crear HistoryPage

**Files:**
- Create: `client/src/pages/HistoryPage.tsx`
- Create: `client/src/pages/HistoryPage.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

  Crear `client/src/pages/HistoryPage.test.tsx`:

  ```typescript
  import { describe, it, expect, vi } from 'vitest'
  import { render, screen } from '@testing-library/react'
  import { MemoryRouter } from 'react-router-dom'

  const mockNavigate = vi.fn()
  vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>()
    return { ...actual, useNavigate: () => mockNavigate }
  })

  vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn()
  }))

  vi.mock('../lib/supabase', () => ({
    supabase: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    }
  }))

  import HistoryPage from './HistoryPage'
  import { useAuth } from '../context/AuthContext'

  describe('HistoryPage', () => {
    it('redirects to / when user is not logged in', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null, loading: false,
        signIn: vi.fn(), signOut: vi.fn()
      })
      render(<MemoryRouter><HistoryPage /></MemoryRouter>)
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })

    it('shows empty state when user has no bills', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-1', email: 'test@test.com' } as any,
        loading: false, signIn: vi.fn(), signOut: vi.fn()
      })
      render(<MemoryRouter><HistoryPage /></MemoryRouter>)
      expect(await screen.findByText(/no tienes facturas/i)).toBeTruthy()
    })
  })
  ```

- [ ] **Step 2: Correr el test para confirmar que falla**

  ```bash
  cd client && npm test -- HistoryPage
  ```

  Expected: FAIL con "Cannot find module './HistoryPage'"

- [ ] **Step 3: Crear HistoryPage.tsx**

  Crear `client/src/pages/HistoryPage.tsx`:

  ```typescript
  import { useEffect, useState } from 'react'
  import { useNavigate, Link } from 'react-router-dom'
  import { useAuth } from '../context/AuthContext'
  import { supabase } from '../lib/supabase'

  interface BillRow {
    id: string
    created_at: string
    data: { total?: number; people?: Array<{ name: string }> }
  }

  export default function HistoryPage() {
    const { user, loading } = useAuth()
    const navigate = useNavigate()
    const [bills, setBills] = useState<BillRow[]>([])
    const [fetching, setFetching] = useState(true)

    useEffect(() => {
      if (!loading && !user) {
        navigate('/', { replace: true })
        return
      }
      if (!user) return

      supabase
        .from('bills')
        .select('id, created_at, data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) setBills(data as BillRow[])
          setFetching(false)
        })
    }, [user, loading, navigate])

    if (loading || fetching) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-on-surface-variant text-sm">Cargando...</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col min-h-screen px-5 pb-10">
        <header className="pt-8 pb-6">
          <h1 className="font-heading font-bold text-2xl">Mis facturas</h1>
          <p className="text-on-surface-variant text-sm mt-1">{user?.email}</p>
        </header>

        {bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <div className="text-4xl mb-3">🧾</div>
            <p className="text-on-surface-variant text-sm">
              No tienes facturas guardadas todavía.
            </p>
            <Link to="/" className="mt-4 text-primary font-semibold text-sm">
              Dividir una cuenta →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bills.map(bill => {
              const peopleNames = bill.data.people?.map(p => p.name).join(', ') ?? ''
              const date = new Date(bill.created_at).toLocaleDateString('es-PA')
              return (
                <Link
                  key={bill.id}
                  to={`/share/${bill.id}`}
                  className="block bg-white rounded-2xl shadow-sm px-4 py-3"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold">{peopleNames || 'Cuenta'}</p>
                      <p className="text-xs text-on-surface-variant">{date}</p>
                    </div>
                    <span className="text-primary font-bold text-sm">Ver →</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 4: Correr los tests y verificar que pasan**

  ```bash
  cd client && npm test -- HistoryPage
  ```

  Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/HistoryPage.tsx client/src/pages/HistoryPage.test.tsx
  git commit -m "feat: add HistoryPage showing user's past bills"
  ```

---

## Task 15: Actualizar App.tsx

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Reemplazar App.tsx**

  ```typescript
  import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

  export default function App() {
    return (
      <AuthProvider>
        <BillProvider>
          <BrowserRouter>
            <TopBar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/assign" element={<AssignPage />} />
              <Route path="/summary" element={<SummaryPage />} />
              <Route path="/share" element={<SharePage />} />
              <Route path="/share/:billId" element={<SharePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
            </Routes>
          </BrowserRouter>
        </BillProvider>
      </AuthProvider>
    )
  }
  ```

- [ ] **Step 2: Verificar build completo**

  ```bash
  cd client && npm run build
  ```

  Expected: build exitoso sin errores de TypeScript.

- [ ] **Step 3: Correr todos los tests del cliente**

  ```bash
  cd client && npm test
  ```

  Expected: todos los tests pasan (14 existentes + 3 nuevos = 17 tests).

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/App.tsx
  git commit -m "feat: wire AuthProvider, TopBar, and new routes in App.tsx"
  ```

---

## Task 16: Variables de entorno en Vercel

**Files:** Ninguno (configuración en Vercel dashboard)

- [ ] **Step 1: Agregar variables en Vercel**

  Ir a https://vercel.com → proyecto spliteat → Settings → Environment Variables. Agregar:

  | Variable | Valor | Environment |
  |----------|-------|-------------|
  | `ANTHROPIC_API_KEY` | (ya existe) | All |
  | `SUPABASE_URL` | `https://xxxx.supabase.co` | All |
  | `SUPABASE_ANON_KEY` | `eyJ...` | All |
  | `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | All |
  | `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | All |
  | `VITE_SUPABASE_ANON_KEY` | `eyJ...` (anon key, no service_role) | All |

  > ⚠️ `SUPABASE_SERVICE_ROLE_KEY` nunca debe estar en `VITE_*` — solo para las serverless functions.

- [ ] **Step 2: Push a GitHub para triggear el deploy**

  ```bash
  git push origin master
  ```

  Vercel detecta el push y hace deploy automático.

- [ ] **Step 3: Verificar el deploy en Vercel dashboard**

  En Vercel → Deployments: confirmar que el build pasó. Si hay errores, revisar los logs de build.

---

## Task 17: Verificación end-to-end

- [ ] **Step 1: Verificar POST /api/bills funciona**

  Usando el browser o curl, abrir `https://spliteat.vercel.app`, completar el flujo normal (OCR o entrada manual), llegar a Summary, presionar "Compartir". Verificar que:
  - El link de WhatsApp usa `/share/<uuid>` (no `/share?d=...`)
  - La URL compartida carga correctamente el resumen

- [ ] **Step 2: Verificar login con magic link**

  En `https://spliteat.vercel.app`:
  - Presionar "Iniciar sesión" en la TopBar
  - Ingresar un email real
  - Revisar el email → click en el enlace → debe redirigir a `/history`
  - Verificar que aparece el email del usuario en la TopBar

- [ ] **Step 3: Verificar que una factura creada logueado aparece en historial**

  Estando logueado, completar el flujo de dividir una cuenta y compartir. Luego ir a `/history` y verificar que la factura aparece en la lista.

- [ ] **Step 4: Verificar backward compat de links viejos**

  Si tienes un link viejo del formato `/share?d=...` (de v2), verificar que sigue funcionando.

- [ ] **Step 5: Verificar que facturas anónimas siguen funcionando**

  Sin estar logueado, completar el flujo y compartir. Verificar que la share page carga correctamente.

---

## Notas de implementación

**Sobre el TopBar y el diseño visual:** El TopBar se agrega encima de todas las páginas. Si alguna página ya tiene su propio header (como SharePage que tiene el header de SplitEat), revisar si queda bien visualmente y ajustar padding/layout según sea necesario.

**Sobre los tests del servidor (server/):** Los 10 tests existentes en `server/` prueban la lógica SQLite. No hace falta tocarlos — el servidor Express sigue siendo el entorno de dev local y sus tests siguen siendo válidos.

**Sobre el client/.env.local:** Este archivo no se commitea (está en .gitignore). Cada desarrollador debe crearlo manualmente con las credenciales de Supabase. Las instrucciones están en `client/.env.example`.

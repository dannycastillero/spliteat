# Pre-QA Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar CTA en share page y rate limiting + validación de tamaño en `/api/ocr` antes del beta testing.

**Architecture:** Dos features independientes. El CTA es un cambio puramente de UI en `SharePage.tsx`. El rate limiting usa una tabla Supabase + función RPC para trackear llamadas por IP de forma atómica y stateless — portable si se cambia de hosting.

**Tech Stack:** React + TypeScript (frontend), Node.js serverless (backend), Supabase Postgres (rate limit store), Vitest + @testing-library/react (tests).

---

## File Map

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `client/src/pages/SharePage.tsx` | Modificar | Agregar card CTA al final |
| `client/src/pages/SharePage.test.tsx` | Crear | Test del CTA |
| `api/ocr.js` | Modificar | Agregar validación de tamaño + rate limiting |
| Supabase migration | Aplicar | Tabla `rate_limits` + función `check_rate_limit` |

---

## Task 1: Migración Supabase — tabla rate_limits + función check_rate_limit

**Files:**
- Supabase migration (via MCP): tabla `rate_limits` + función RPC `check_rate_limit`

- [ ] **Step 1: Aplicar migración**

Ejecutar via Supabase MCP (`apply_migration`, project `kvifhshmhggzmpmcoymx`, name `rate_limits_and_check_function`):

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  ip           text        NOT NULL,
  endpoint     text        NOT NULL,
  count        integer     NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ip, endpoint)
);

CREATE OR REPLACE FUNCTION check_rate_limit(p_ip text, p_endpoint text)
RETURNS TABLE(allowed boolean, current_count integer)
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  SELECT count, window_start INTO v_count, v_window_start
  FROM rate_limits
  WHERE ip = p_ip AND endpoint = p_endpoint
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO rate_limits (ip, endpoint, count, window_start)
    VALUES (p_ip, p_endpoint, 1, now());
    RETURN QUERY SELECT true::boolean, 1::integer;
    RETURN;
  END IF;

  IF v_window_start < now() - interval '1 hour' THEN
    UPDATE rate_limits SET count = 1, window_start = now()
    WHERE ip = p_ip AND endpoint = p_endpoint;
    RETURN QUERY SELECT true::boolean, 1::integer;
    RETURN;
  END IF;

  IF v_count >= 20 THEN
    RETURN QUERY SELECT false::boolean, v_count::integer;
    RETURN;
  END IF;

  UPDATE rate_limits SET count = count + 1
  WHERE ip = p_ip AND endpoint = p_endpoint;
  RETURN QUERY SELECT true::boolean, (v_count + 1)::integer;
END;
$$;
```

- [ ] **Step 2: Verificar que la tabla y función existen**

```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'rate_limits';
SELECT proname FROM pg_proc WHERE proname = 'check_rate_limit';
```

Esperado: ambas queries retornan 1 fila.

---

## Task 2: Rate limiting + validación de tamaño en api/ocr.js

**Files:**
- Modify: `api/ocr.js`

- [ ] **Step 1: Reemplazar el contenido completo de api/ocr.js**

```javascript
const { createClient } = require('@supabase/supabase-js')

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
- isPotentialAlcohol = true si el nombre sugiere bebida alcohólica (ron, cerveza, vino, whisky, vodka, tequila, gin, balboa, seco, botella, trago, cóctel, beer, wine, rum, bourbon, champagne, prosecco, sangria, daiquiri, mojito)
- Si hay propina sugerida en la factura incluye el porcentaje en detectedTipPercentage (ej: 10), si no hay pon null
- Precios en números decimales sin símbolo de moneda
- Si un item tiene cantidad > 1: unitPrice = precio unitario, totalPrice = unitPrice × quantity`

const MAX_IMAGE_SIZE = 7_000_000

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (!forwarded) return null
  return forwarded.split(',')[0].trim()
}

async function checkRateLimit(ip) {
  if (!ip) return true
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_ip: ip,
      p_endpoint: 'ocr'
    })
    if (error) return true
    return data?.[0]?.allowed !== false
  } catch {
    return true
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, mediaType = 'image/jpeg' } = req.body || {}

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' })
  }

  if (imageBase64.length > MAX_IMAGE_SIZE) {
    return res.status(400).json({ error: 'La imagen es demasiado grande. Máximo 5MB.' })
  }

  const ip = getClientIp(req)
  const allowed = await checkRateLimit(ip)
  if (!allowed) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo en una hora.' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: OCR_PROMPT },
          ],
        }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in OCR response')

    res.json(JSON.parse(match[0]))
  } catch (err) {
    console.error('OCR error:', err)
    res.status(500).json({ error: 'Failed to extract items from image' })
  }
}
```

- [ ] **Step 2: Verificar manualmente que el tamaño funciona (curl)**

```bash
curl -s -X POST https://spliteat.vercel.app/api/ocr \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"'$(python3 -c "print('A' * 7000001)")'"}' | head -c 100
```

Esperado: `{"error":"La imagen es demasiado grande. Máximo 5MB."}`

- [ ] **Step 3: Commit**

```bash
git add api/ocr.js
git commit -m "feat: add rate limiting and payload size validation to /api/ocr"
```

---

## Task 3: CTA en SharePage

**Files:**
- Modify: `client/src/pages/SharePage.tsx`
- Create: `client/src/pages/SharePage.test.tsx`

- [ ] **Step 1: Escribir el test que falla primero**

Crear `client/src/pages/SharePage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../api/client', () => ({
  getBillByCode: vi.fn(),
  getBillFromServer: vi.fn(),
}))

import SharePage from './SharePage'
import { getBillByCode } from '../api/client'

const mockBill = {
  items: [
    {
      id: '1',
      name: 'Ceviche',
      quantity: 1,
      unitPrice: 10,
      totalPrice: 10,
      isAlcohol: false,
      isPotentialAlcohol: false,
      assignedTo: ['p1'],
    },
  ],
  people: [{ id: 'p1', name: 'Ana', color: '#FF5F5F' }],
  tipPercentage: 0,
}

describe('SharePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('muestra CTA para dividir cuenta propia', async () => {
    vi.mocked(getBillByCode).mockResolvedValue(mockBill)
    render(
      <MemoryRouter initialEntries={['/s/abc123']}>
        <Routes>
          <Route path="/s/:code" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(await screen.findByText('Divide tu cuenta gratis →')).toBeTruthy()
  })

  it('navega a / al tocar el CTA', async () => {
    vi.mocked(getBillByCode).mockResolvedValue(mockBill)
    render(
      <MemoryRouter initialEntries={['/s/abc123']}>
        <Routes>
          <Route path="/s/:code" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    )
    const btn = await screen.findByText('Divide tu cuenta gratis →')
    fireEvent.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
```

- [ ] **Step 2: Correr el test para verificar que falla**

```bash
cd client && npx vitest run src/pages/SharePage.test.tsx
```

Esperado: FAIL — `Unable to find an element with the text: Divide tu cuenta gratis →`

- [ ] **Step 3: Implementar el CTA en SharePage.tsx**

Agregar `useNavigate` al import de react-router-dom y reemplazar el footer existente:

En `client/src/pages/SharePage.tsx`, cambiar:
```tsx
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
```
por:
```tsx
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
```

Dentro del componente `SharePage`, justo después de `const [error, setError] = useState(false)`, agregar:
```tsx
const navigate = useNavigate()
```

Reemplazar el div final del return:
```tsx
      <div className="text-center mt-8 text-xs text-gray-400">
        Generado con SplitEat 🍽️
      </div>
```
por:
```tsx
      <div className="mt-10 rounded-2xl bg-gray-50 px-5 py-6 text-center">
        <p className="text-sm text-on-surface-variant mb-4">
          ¿Tienes que dividir la próxima cuenta?
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-primary text-white font-heading font-semibold py-3 rounded-full text-sm"
        >
          Divide tu cuenta gratis →
        </button>
      </div>
```

- [ ] **Step 4: Correr el test para verificar que pasa**

```bash
cd client && npx vitest run src/pages/SharePage.test.tsx
```

Esperado: PASS — 2 tests passed.

- [ ] **Step 5: Correr todos los tests para verificar que no hay regresiones**

```bash
cd client && npx vitest run
```

Esperado: todos los tests pasan.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/SharePage.tsx client/src/pages/SharePage.test.tsx
git commit -m "feat: add CTA to share page to drive new user acquisition"
```

---

## Task 4: Push y verificación en producción

- [ ] **Step 1: Push a master**

```bash
git push origin master
```

- [ ] **Step 2: Verificar rate limiting en producción (después del deploy ~60s)**

```bash
curl -s -X POST https://spliteat.vercel.app/api/ocr \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"test_too_large_'$(python3 -c "print('A' * 7000001)")'"}' | head -c 100
```

Esperado: `{"error":"La imagen es demasiado grande. Máximo 5MB."}`

- [ ] **Step 3: Verificar share page CTA en producción**

Abrir `https://spliteat.vercel.app/s/cc14fc` (o cualquier código válido) y confirmar que aparece el card CTA al final.

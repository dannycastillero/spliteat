# Spec: SplitEat — Short Links para compartir por WhatsApp

**Fecha:** 2026-06-08
**Estado:** Aprobado

---

## Problema

Las URLs de WhatsApp actuales usan el UUID completo de la factura:

```
spliteat.vercel.app/share/a7b3c1d2-e5f6-4a8b-9c3d-1e2f3a4b5c6d
```

36 caracteres de UUID hacen el mensaje largo e impersonal. Se reemplaza con un código corto de 6 caracteres:

```
spliteat.vercel.app/s/abc123
```

---

## Arquitectura

No hay cambio en la arquitectura general — se extiende la tabla `bills` con una columna nueva, se agrega una serverless function, y se ajustan 4 archivos del cliente.

---

## Base de datos

### Migración

```sql
ALTER TABLE bills ADD COLUMN short_code CHAR(6) UNIQUE NOT NULL DEFAULT '';
CREATE UNIQUE INDEX idx_bills_short_code ON bills(short_code);
```

### Formato del short_code

- 6 caracteres alfanuméricos en minúsculas: `[a-z0-9]`
- Generado con `Math.random().toString(36).slice(2, 8)`
- ~2.2 billones de combinaciones posibles
- Generado server-side en `api/bills.ts` al crear la factura
- Nunca generado ni expuesto en el cliente antes de recibir la respuesta

### Manejo de colisiones

`api/bills.ts` reintenta hasta 3 veces si Supabase retorna error de unicidad (código `23505`). En la práctica imposible a la escala de SplitEat, pero manejado correctamente.

---

## Backend

### `api/bills.ts` (modificar)

Cambios:
1. Generar `short_code` antes del insert
2. Incluirlo en el `insert`
3. Hacer `.select('id, short_code')` en vez de `.select('id')`
4. Retornar `{ billId: bill.id, shortCode: bill.short_code }`

Lógica de generación con reintentos:

```typescript
async function createBillWithRetry(supabase, userId, data, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    const short_code = Math.random().toString(36).slice(2, 8)
    const { data: bill, error } = await supabase
      .from('bills')
      .insert({ user_id: userId, data, short_code })
      .select('id, short_code')
      .single()
    if (!error) return bill
    if (error.code !== '23505') throw error  // solo reintentar en colisión
  }
  throw new Error('Failed to generate unique short code')
}
```

### `api/s/[code].ts` (crear)

Nueva serverless function. Recibe el `code` desde `req.query`, busca en Supabase por `short_code`, retorna el `data` del bill. 404 si no existe.

```typescript
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).end()
  const { code } = req.query as { code: string }
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: bill } = await supabase.from('bills').select('data').eq('short_code', code).single()
  if (!bill) return res.status(404).json({ error: 'Bill not found' })
  res.json(bill.data)
}
```

---

## Cliente

### `client/src/api/client.ts`

- `saveBillToServer` retorna `{ billId: string, shortCode: string }` (antes solo `{ billId }`)
- Nueva función `getBillByCode(code: string)` que llama a `GET /api/s/${code}`

### `client/src/pages/SummaryPage.tsx`

`handleShare` desestructura `{ billId, shortCode }` y construye:

```typescript
const shareUrl = `${window.location.origin}/s/${shortCode}`
```

El `billId` se mantiene disponible por si se necesita en el futuro (historial).

### `client/src/pages/SharePage.tsx`

Agregar tercer caso al `useEffect` existente. El componente ya recibe params de dos rutas:

| Ruta | Param | Resolución |
|------|-------|------------|
| `/share/:billId` | `billId` (useParams) | `getBillFromServer(billId)` |
| `/share?d=...` | `d` (useSearchParams) | decode base64 |
| `/s/:code` | `code` (useParams, ruta nueva) | `getBillByCode(code)` |

El `useEffect` detecta la ruta activa usando `useParams` y `useSearchParams`. No hay ambigüedad porque `/s/:code` usa un param llamado `code`, distinto de `billId`.

### `client/src/App.tsx`

Agregar ruta:

```tsx
<Route path="/s/:code" element={<SharePage />} />
```

Rutas existentes no cambian. Backward compat con `/share/:billId` y `/share?d=` garantizada.

---

## Backward compatibility

- Los links viejos con `/share/:billId` siguen funcionando sin cambios
- Los links legacy con `/share?d=...` (base64) siguen funcionando
- Solo las facturas **nuevas** (creadas después de este deploy) usan `/s/:code`
- Las facturas en DB que tengan `short_code = ''` (antes de la migración) no son afectadas porque no tienen links compartidos aún

---

## Variables de entorno

Sin cambios. Las funciones `api/s/[code].ts` usa las mismas variables que ya existen:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Tests

| Archivo | Test |
|---------|------|
| `api/bills.test.ts` | Verificar que la respuesta incluye `shortCode` |
| `client/src/api/client.test.ts` | Verificar que `saveBillToServer` retorna `{ billId, shortCode }` y que `getBillByCode` llama al endpoint correcto |

Los tests del servidor Express (`server/`) no se tocan — no son relevantes para esta feature.

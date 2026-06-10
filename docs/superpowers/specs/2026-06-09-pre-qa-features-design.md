# Spec — Features Pre-QA: CTA en share page + Rate limiting OCR

**Fecha:** 2026-06-09
**Estado:** Aprobado

---

## Contexto

Antes del lanzamiento del beta testing con 20-30 usuarios, se identificaron dos features de alta prioridad:

1. **CTA en share page** — la persona que recibe un link compartido no tiene ningún llamado a la acción para probar la app. Es el punto de mayor adquisición orgánica y hoy se pierde.
2. **Rate limiting en `/api/ocr`** — el endpoint de OCR no tiene ninguna protección. Un actor malicioso puede generar costos en la Anthropic API enviando llamadas repetidas.

---

## Feature 1: CTA en share page

### Objetivo

Convertir a los visitantes de la share page (quienes reciben el link) en usuarios de la app.

### Diseño

**Ubicación:** Al final de `SharePage.tsx`, reemplazando el texto actual "Generado con SplitEat 🍽️".

**Componente:** Un card visualmente separado del contenido de la cuenta, con fondo suave, margen superior generoso.

**Contenido:**
- Texto: "¿Tienes que dividir la próxima cuenta?"
- Botón coral full-width: "Divide tu cuenta gratis →"

**Comportamiento:** Al tocar el botón, navega a `/` usando `useNavigate` de React Router (navegación interna, sin recarga de página).

**Alcance:** Solo se modifica `SharePage.tsx`. Sin cambios en routing, API ni otros componentes.

---

## Feature 2: Rate limiting en `/api/ocr`

### Objetivo

Proteger el costo de la Anthropic API limitando llamadas por IP, y proteger contra payloads gigantes.

### Tabla nueva en Supabase: `rate_limits`

```sql
CREATE TABLE rate_limits (
  ip           text        NOT NULL,
  endpoint     text        NOT NULL,
  count        integer     NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ip, endpoint)
);
```

Sin RLS (tabla solo accesible desde el backend via service role key).

### Lógica en `api/ocr.js`

Se agregan dos validaciones al inicio del handler, antes de llamar a Anthropic:

**1. Validación de tamaño del payload:**
- Si `imageBase64.length > 7_000_000` (~5MB en base64) → retorna `400` con mensaje: `"La imagen es demasiado grande. Máximo 5MB."`

**2. Rate limiting por IP:**
- Leer IP desde `req.headers['x-forwarded-for']` (primer valor si hay varios)
- Consultar Supabase con service role key: ¿existe registro `(ip, 'ocr')` con `window_start` en la última hora?
  - **No existe / venció la ventana:** hacer upsert con `count = 1`, `window_start = now()`
  - **Existe y `count < 20`:** incrementar `count` en 1
  - **Existe y `count >= 20`:** retorna `429` con mensaje: `"Demasiadas solicitudes. Intenta de nuevo en una hora."`
- Si pasa la validación, continúa con el OCR

**Límite:** 20 llamadas por IP por hora por endpoint.

**Portabilidad:** toda la lógica de estado vive en Supabase. Si se cambia de plataforma de hosting, solo cambia el wrapper del handler, no la lógica de rate limiting.

### Consideraciones

- Si Supabase falla al consultar `rate_limits`, se permite la llamada (fail open) para no bloquear usuarios legítimos por un error de infraestructura.
- La IP puede ser `null` o vacía en entornos locales — en ese caso se omite el check de rate limiting.

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `client/src/pages/SharePage.tsx` | Agregar card CTA al final |
| `api/ocr.js` | Agregar validación de tamaño + rate limiting |
| Supabase (migration) | Crear tabla `rate_limits` |

---

## Lo que NO cambia

- Routing
- Otros endpoints (`/api/bills`, `/api/s/:code`)
- Lógica de cálculo fiscal
- Autenticación

# Master Plan — SplitEat

**Última actualización:** 2026-06-09

---

## Visión

Aplicación web mobile-first para dividir cuentas de restaurantes en Panamá con impuestos correctos (7% ITBMS / 10% licor). Con login opcional para historial de facturas y descuentos de comercios afiliados (Fase 2).

URL de producción: `spliteat.vercel.app`

---

## Sub-proyectos

### v1 / v2 — MVP (COMPLETO ✅)
Spec: [2026-05-24-spliteat-design.md](superpowers/specs/2026-05-24-spliteat-design.md)

| Paso | Descripción | Estado |
|------|-------------|--------|
| 1-19 | Implementación completa del MVP | ✅ Completo |
| Tests | 10/10 server tests, 14/14 client tests | ✅ Completo |
| Deploy | Cliente en Vercel, OCR como serverless function | ✅ Completo |

---

### v3 — Supabase + Login + Short Links (CÓDIGO COMPLETO ✅ / DEPLOY PENDIENTE ⏳)

Spec login: [2026-06-03-supabase-login-design.md](superpowers/specs/2026-06-03-supabase-login-design.md)
Spec short links: [2026-06-08-short-links-design.md](superpowers/specs/2026-06-08-short-links-design.md)
Plan short links: [2026-06-08-short-links.md](superpowers/plans/2026-06-08-short-links.md)

| Paso | Descripción | Estado |
|------|-------------|--------|
| Supabase DB | Tabla bills + RLS + índices + columna short_code | ✅ Completo |
| `api/bills.ts` | POST crear factura con short_code, retorna `{ billId, shortCode }` | ✅ Completo |
| `api/bills/[billId].ts` | GET por UUID | ✅ Completo |
| `api/s/[code].ts` | GET por short_code (6 chars) | ✅ Completo |
| Supabase Auth | Email + contraseña, signup, signin, forgot password | ✅ Completo |
| AuthContext | Estado global de auth en el cliente | ✅ Completo |
| LoginPage | Página de login con tabs Ingresar/Crear Cuenta | ✅ Completo |
| TopBar | Barra con login/logout y "Mis facturas" | ✅ Completo |
| HistoryPage | Historial de facturas del usuario | ✅ Completo |
| SharePage | Soporta `/s/:code`, `/share/:billId`, `?d=` legacy | ✅ Completo |
| SummaryPage | Share genera URL `/s/:code` | ✅ Completo |
| **Variables de entorno en Vercel** | Agregar SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY, VITE_* | ⏳ **Pendiente** |
| **Deploy a producción** | git push → Vercel auto-deploy | ⏳ **Pendiente** |
| **Verificación E2E en producción** | Probar flujo completo en spliteat.vercel.app | ⏳ **Pendiente** |

---

### v4 — QA y Beta Testing (EN PLANIFICACIÓN 🎨)

| Paso | Descripción | Estado |
|------|-------------|--------|
| Plan de QA | Casos de prueba, guía para usuarios beta | ⏳ Pendiente |
| Formulario de feedback | Google Sheets/Forms para 20-30 usuarios | ⏳ Pendiente |
| Envío a beta testers | Distribuir URL + formulario | ⏳ Pendiente |
| Análisis de feedback | Revisar respuestas y priorizar cambios | ⏳ Pendiente |

---

## Próximos pasos inmediatos

| Acción | Tipo | Prioridad |
|--------|------|-----------|
| Agregar variables de entorno en Vercel | Manual | 🔴 Alta |
| Deploy a producción (git push) | Manual | 🔴 Alta |
| Verificar app en spliteat.vercel.app | Manual | 🔴 Alta |
| Planificar QA + formulario de feedback | Con IA | 🟡 Media |

---

## Supabase

- **Proyecto:** SplitEasy
- **ID:** `kvifhshmhggzmpmcoymx`
- **URL:** `https://kvifhshmhggzmpmcoymx.supabase.co`
- **Region:** us-west-2

---

## Archivos clave

```
spliteat-v3/
├── vercel.json                  ← build config para Vercel
├── api/
│   ├── ocr.js                   ← OCR serverless function ✓
│   ├── bills.ts                 ← POST crear factura con short_code ✓
│   ├── bills/[billId].ts        ← GET por UUID ✓
│   └── s/[code].ts              ← GET por short_code ✓
├── client/
│   ├── .env.local               ← vars de desarrollo (no en git)
│   └── src/
│       ├── context/AuthContext  ← estado global de auth
│       ├── pages/LoginPage      ← login email+contraseña
│       ├── pages/HistoryPage    ← historial del usuario
│       ├── pages/SharePage      ← vista pública de cuenta
│       └── pages/SummaryPage    ← resumen + share button
└── docs/
    ├── MASTER-PLAN.md
    ├── SPEC.md
    └── superpowers/
        ├── specs/
        │   ├── 2026-05-24-spliteat-design.md
        │   ├── 2026-06-03-supabase-login-design.md
        │   └── 2026-06-08-short-links-design.md
        └── plans/
            ├── 2026-05-24-spliteat-mvp.md
            ├── 2026-06-03-supabase-login.md
            └── 2026-06-08-short-links.md
```

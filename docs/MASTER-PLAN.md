# Master Plan — SplitEat

**Última actualización:** 2026-06-03

---

## Visión

Aplicación web mobile-first para dividir cuentas de restaurantes en Panamá con impuestos correctos (7% ITBMS / 10% licor). Gratuita y sin registro. Con login opcional para acceder a descuentos de comercios afiliados (Fase 2).

---

## Sub-proyectos

### v1 / v2 — MVP (COMPLETO ✅)
Spec: [2026-05-24-spliteat-design.md](superpowers/specs/2026-05-24-spliteat-design.md)
Plan: [2026-05-24-spliteat-mvp.md](superpowers/plans/2026-05-24-spliteat-mvp.md)

| Paso | Descripción | Estado |
|------|-------------|--------|
| 1-19 | Implementación completa del MVP | ✅ Completo |
| Tests | 10/10 server tests, 14/14 client tests | ✅ Completo |
| Deploy | Cliente en Vercel, OCR como serverless function | ✅ Completo |

**Resultado:** `spliteat.vercel.app` funcionando. OCR extrae items, flujo completo de división de cuenta, share por WhatsApp.

**Problema pendiente detectado:** Las rutas `/api/bills` (guardar/recuperar facturas) usan Express + SQLite que no está deployado en Vercel. Solo el OCR funciona en producción.

---

### v3 — Supabase + Login (EN DISEÑO 🎨)
Spec: [2026-06-03-supabase-login-design.md](superpowers/specs/2026-06-03-supabase-login-design.md)

| Paso | Descripción | Estado |
|------|-------------|--------|
| Diseño | Spec de arquitectura Supabase + Auth | ✅ Completo |
| Plan | Plan de implementación detallado | ⏳ Pendiente |
| Impl | Vercel functions + Supabase DB + Auth UI | ⏳ Pendiente |

**Objetivo:** Resolver el deploy del backend y agregar login con historial de facturas.

---

## Próximos pasos

| Acción | Tipo | Prioridad |
|--------|------|-----------|
| Crear plan de implementación v3 | Con IA | Alta |
| Crear proyecto en Supabase | Manual | Alta |
| Configurar RLS y tabla bills en Supabase | Manual | Alta |
| Implementar `api/bills.ts` y `api/bills/[billId].ts` | Código | Alta |
| Integrar Supabase Auth (magic link) | Código | Alta |
| Agregar UI: LoginModal, Navbar, HistoryPage | Código | Media |
| Agregar variables de entorno en Vercel | Manual | Alta |

---

## Archivos clave

```
SplitEat/
├── CLAUDE.md
├── vercel.json
├── api/
│   └── ocr.js                  ← serverless function (funciona en prod)
├── client/                     ← React + Vite (deployado en Vercel)
├── server/                     ← Express + SQLite (solo dev local)
└── docs/
    ├── MASTER-PLAN.md
    ├── SPEC.md
    └── superpowers/
        ├── specs/
        │   ├── 2026-05-24-spliteat-design.md
        │   └── 2026-06-03-supabase-login-design.md
        └── plans/
            └── 2026-05-24-spliteat-mvp.md
```

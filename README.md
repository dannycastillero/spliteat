# SplitEat

Web app para dividir cuentas de restaurante en Panamá con impuestos correctos (7% ITBMS / 10% licor).

## Cómo ejecutar

```bash
npm run dev
```

Abre `http://localhost:5173` en el navegador (vista mobile recomendada — iPhone 12 Pro en DevTools).

## Configuración requerida

1. Copia `server/.env.example` → `server/.env`
2. Agrega tu `ANTHROPIC_API_KEY` en `server/.env`

Para obtener la clave:
- Ve a https://console.anthropic.com/
- Inicia sesión o crea una cuenta
- En la barra lateral, selecciona "API Keys" → "Create Key"
- Copia la clave y pégala en `server/.env` como `ANTHROPIC_API_KEY=sk-ant-...`

## Flujo de la app

1. **Scan/Upload** — Toma foto de la factura o súbela desde galería
2. **Review** — Verifica los items detectados, marca los licores, elige la propina
3. **Assign** — Agrega personas y asigna cada item a quien lo comió
4. **Summary** — Ve el total de cada persona con impuestos y comparte por WhatsApp

## Impuestos (Panamá)

- Comida y bebidas sin alcohol: **7% ITBMS**
- Bebidas alcohólicas: **10%**
- Propina: proporcional al subtotal de cada persona

## Stack técnico

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Backend:** Express + TypeScript + SQLite (node:sqlite)
- **OCR:** Claude Vision API (claude-sonnet-4-6)
- **Tests:** Vitest (client) + node:test (server)

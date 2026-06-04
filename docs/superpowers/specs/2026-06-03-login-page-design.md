# SplitEat — Login Page Design

**Fecha:** 2026-06-03

## Qué se construye

Reemplazar el LoginModal (bottom-sheet) por una página dedicada `/login` con autenticación email + contraseña.

## Decisiones de diseño

- **Auth:** Email + contraseña (no magic link). Más familiar para usuarios en Panamá.
- **Estructura:** Página completa `/login`, no modal.
- **Tabs:** "Ingresar" / "Crear Cuenta" en la misma página.
- **Invitado:** Botón "Continua como Invitado" → navega a `/` sin autenticación.
- **Teléfono:** NO incluido (reduce fricción en registro, se puede agregar después).
- **Forgot Password:** Email → reset link de Supabase → "revisa tu email".

## Archivos

| Archivo | Cambio |
|---------|--------|
| `client/src/pages/LoginPage.tsx` | Crear |
| `client/src/pages/LoginPage.test.tsx` | Crear |
| `client/src/context/AuthContext.tsx` | Reemplazar signInWithOtp → signInWithPassword + signUp + resetPassword |
| `client/src/context/AuthContext.test.tsx` | Actualizar mocks |
| `client/src/components/TopBar.tsx` | navigate('/login') en vez de modal |
| `client/src/App.tsx` | Agregar ruta /login, eliminar LoginModal |
| `client/src/components/LoginModal.tsx` | Eliminar |

## UI

- Header oscuro (`primary-dark`) con emoji 🍽️, "Bienvenido", subtitle
- Tabs pill con color `primary`
- Ingresar: Email + Password + "¿Olvidaste tu contraseña?" + "Ingresa →" + divider + "Continua como Invitado"
- Crear Cuenta: Banner verde info + Nombre + Email + Password + "Crear Cuenta" + divider + "Continuar como Invitado"

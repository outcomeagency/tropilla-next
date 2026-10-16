# tropilla-next — Progreso por ticket

Estado de la parte web de cada ticket: rutas, qué está conectado a la API real (`tropilla-api`, `/api/v1`)
y qué cae a datos de ejemplo (`lib/mock/*`). El adaptador de ejemplo **sólo** se activa si el endpoint todavía
no existe (404/405 de ruteo sin `code`) o la API no responde, y siempre lo avisa en pantalla (`<MockNotice>`).
Se apaga con `TROPILLA_MOCK_FALLBACK=0`.

Leyenda: ✅ hecho · 🟦 en curso · 🔌 API real · 🧪 mock (fallback)

---

## TPA-9 · Registro e inicio de sesión · ✅

**Rutas:** `/ingresar`, `/registro`, `/recuperar`, `/restablecer?token=`, `/verificar-email?token=`, `/salir`

| Pieza | Endpoint | Estado |
|---|---|---|
| Login (email o teléfono en un solo campo) | `POST /auth/login` (`cliente: web`) | 🔌 |
| Registro | `POST /auth/register` | 🔌 |
| Sesión del panel | `GET /auth/me` | 🔌 |
| Recuperar / restablecer | `POST /auth/password/olvide`, `/restablecer` | 🔌 (olvide probado: 204) |
| Verificar email | `POST /auth/email/verificar` | 🔌 (sin probar: falta mail de prueba) |
| Logout | `POST /auth/logout` + borrar cookie | 🔌 |
| Sesión demo | `demo@tropilla.ar` / `tropilla-demo` → token `mock-demo` sólo si `/auth/login` no existe | 🧪 (inactivo: la API ya tiene auth) |

**Comentario del dev:** El token Sanctum nunca toca el navegador: las Server Actions lo guardan en la cookie
httpOnly y `lib/auth.ts` resuelve `/auth/me` una vez por request. Errores 422 de la API se mapean campo por campo
(`ApiError.field`) y la validación local evita viajes inútiles. «Olvidé mi contraseña» responde igual exista o
no la cuenta (no filtra). Tipos generados del OpenAPI en `lib/api-types.ts` (`npm run api:types`). Las pantallas
de cuenta comparten `AuthShell`: verde monte con foto real de campo, sin degradados.

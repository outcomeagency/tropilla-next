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

## TPA-10 · Alta de productor y establecimiento · ✅

**Rutas:** `/bienvenida` (asistente de 3 pasos), `/bienvenida/listo` (cómo cargar la hacienda)

| Pieza | Endpoint | Estado |
|---|---|---|
| Alta productor + primer establecimiento (queda Dueño) | `POST /onboarding` | 🔌 probado end-to-end |
| Panel sin establecimiento → onboarding | `GET /auth/me` (`membresias: []`) | 🔌 |
| Aviso «Verificá tu email» + reenviar | `POST /auth/email/reenviar` | 🔌 |
| Provincias/departamentos | `lib/geo.ts` (INDEC: Corrientes = seeder de la API; Chaco/Formosa/Misiones con codificación INDEC) | estático hasta que `/catalogos` publique `geo` |
| Alta demo | sólo con sesión `mock-*` si `/onboarding` no existe | 🧪 (inactivo) |

**Comentario del dev:** Asistente en tres pasos (productor → establecimiento → producción y sanidad) con
validación local por paso y errores 422 de la API mapeados al campo y al paso donde corregir. El envío es
manual (`startTransition`) para que React no resetee el formulario si la API rechaza algo: el productor
nunca pierde lo que cargó. CUIT y RENSPA se piden como opcionales y con candado «privado siempre».
Al crear, queda activo el establecimiento nuevo (cookie `tropilla_est`) y se ofrece planilla, carga por
cantidades o entrar vacío. Zonas sanitarias: defaults razonables para Corrientes, editables.

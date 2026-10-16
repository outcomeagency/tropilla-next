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

## TPA-12 · Selector de establecimiento · ✅

**Rutas:** selector en la sidebar (todas las pantallas del panel), `/establecimientos` (mis establecimientos)

| Pieza | Endpoint | Estado |
|---|---|---|
| Lista de campos con rol | `GET /auth/me` (membresías = la verdad) + `GET /establecimientos` (ubicación, ha, especies) | 🔌 |
| Cambiar de campo | Server Action → cookie httpOnly `tropilla_est` (sólo ids con membresía) | 🔌 |
| Abilities del campo activo | `getContexto().can("ability")` desde `/auth/me` | 🔌 |

**Comentario del dev:** El establecimiento activo vive en una cookie httpOnly y se valida contra las membresías de
`/auth/me` en cada request: no se puede «elegir» un campo ajeno tocando la cookie. Al cambiar, se vuelve a la raíz del
módulo (una ficha de un campo no existe en otro). Con más de 5 campos aparece un buscador (asesores con muchos
clientes). `getContexto()` es la puerta única del panel: sesión, campo activo y abilities para mostrar u ocultar
acciones sin re-implementar la matriz de permisos.

## TPA-54 · Directorio público con buscador · ✅

**Rutas:** `/[locale]/directorio` (es/en/pt), portada `/[locale]` con productores destacados, `/sitemap.xml`, `/robots.txt`

| Pieza | Endpoint | Estado |
|---|---|---|
| Búsqueda y filtros (provincia, especie, raza, categoría, con oferta, con contrato) | `GET /public/directorio` | 🧪 mock (9 productores ficticios, zonas reales) hasta que la API lo publique |
| Sitemap con hreflang | `GET /public/sitemap` | 🧪 → con mock sólo se publican portada y directorio (nunca URLs de ejemplo) |
| Nombres de categorías y razas es/en/pt | `lib/catalogo.ts` | estático hasta `/catalogos` con nombres traducidos |

**Comentario del dev:** Filtros en la URL (compartibles, indexables, funcionan sin JS; con JS se aplican al cambiar).
Datos cacheados con `"use cache"` + `cacheTag("directorio")` para revalidar por tag al publicar. Las tarjetas muestran
sólo zona general (departamento + provincia), especie con chip, razas, ofertas/contratos y frescura; el orden lo
explica la propia página («nadie paga por aparecer primero»). Metadata, canonical y alternates por idioma; la
leyenda fija va en el pie de todo lo público. Fotos de campo de licencia libre (búfalo de agua, nunca africano).

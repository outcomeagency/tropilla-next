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

## TPA-48 · Ofertas de animales y lotes · ✅ (web)

**Rutas públicas:** `/[locale]/ofertas/[codigo]` (preview 03: hero con foto, datos con nivel de confianza por dato,
sobre el establecimiento, trazabilidad del lote, documentos con verificación, condiciones, QR, leyenda fija).
**Rutas del panel:** `/comercializacion` (ofertas con filtros por estado), `/comercializacion/ofertas/nueva`
(elegir lote), `/comercializacion/ofertas/[id]` (datos y qué se muestra → avisos y publicar → compartir).

| Pieza | Endpoint | Estado |
|---|---|---|
| Ficha pública | `GET /public/ofertas/{codigo}` | 🧪 mock (LE0142, LE0157, EN0031, EB0012) |
| Listado / detalle panel | `GET …/ofertas`, `GET …/ofertas/{id}` | 🧪 mock en memoria del servidor |
| Borrador desde lote | `POST …/ofertas/desde-lote` (+ `GET …/lotes`) | 🧪 mock (5 lotes de ejemplo) |
| Editar / avisos / publicar / estado | `PATCH …/ofertas/{id}`, `GET …/avisos`, `POST …/publicar`, `POST …/estado` | 🧪 mock; avisos: retiro vigente y pesaje > 60 d |
| Verificación de email para publicar | `GET /auth/me` (`email_verificado`) | 🔌 (bloquea con mensaje claro) |

**Comentario del dev:** La ficha pública replica la preview 03 con componentes reales: cada dato lleva su nivel
(«Declarado» o «Balanza 10/10/2026 · Integridad registrada») y la trazabilidad del lote se arma sólo con hitos
publicados (nada inventado). Desde el panel, la oferta nace de un lote con lo registrado precargado y de sólo
lectura; el productor elige qué mostrar (privado por defecto) y el precio sólo aparece para quien tiene
`comercial.precios`. Los avisos advierten sin bloquear («Publicar igual» queda registrado). Al publicar: enlace,
QR generado en el servidor, WhatsApp prearmado y cambio de estado (reservada/vendida/retirada).

## TPA-55 · Contacto desde el exterior sin cuenta · ✅ (web)

**Dónde:** sección `#consultar` de la ficha de oferta (y del perfil público, TPA-50), en es/en/pt.

| Pieza | Endpoint | Estado |
|---|---|---|
| Enviar consulta (país, tipo de comprador, volumen, mensaje, idioma) | `POST /public/consultas` + `Idempotency-Key` | 🧪 si el endpoint no existe: confirmación marcada «Demostración: no se envió» |
| Antispam | honeypot `website` + trampa de tiempo (2,5 s) + Turnstile (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`) + 3/h/IP de la API | web lista; Turnstile se activa con la clave |

**Comentario del dev:** Formulario sin cuenta con países localizados por `Intl.DisplayNames` (Mercosur primero),
tipo de comprador en chips y al menos un medio de respuesta. A un bot que cae en el honeypot o envía en menos
de 2,5 s se le responde «enviado» sin tocar la API (no le damos señal). Errores 422/429 de la API se muestran en
el idioma del comprador, y la consulta lleva `idioma` para que el productor sepa en qué responder. La
confirmación explica qué pasa después; en modo demo lo dice explícitamente en vez de simular un envío.

## TPA-50 · Perfil público del establecimiento · ✅ (web)

**Rutas:** `/[locale]/p/[slug]` (público, es/en/pt) · `/perfil-publico` (configuración) · `/perfil-publico/vista-previa?idioma=` (vista como comprador)

| Pieza | Endpoint | Estado |
|---|---|---|
| Perfil público | `GET /public/establecimientos/{slug}` | 🧪 mock (9 perfiles; La Esperanza completo) |
| Configuración (secciones, slug, directorio, historia, idiomas, ubicación pública, contacto visible) | `GET/PATCH …/perfil` | 🧪 mock en memoria |
| Vista previa obligatoria | `GET …/perfil/preview`, `POST …/preview/aceptar` | 🧪 mock; «Publicar» deshabilitado hasta aceptar |
| Publicar / despublicar | `POST …/perfil/publicar|despublicar` + `revalidateTag("perfil:<slug>")` | 🧪 mock |
| Congelar sección derivada | `POST …/secciones/{s}/congelar|descongelar` | 🧪 mock |

**Comentario del dev:** Un solo componente (`PerfilView`) arma el perfil público y la vista previa del panel: el
productor ve exactamente lo que ve el comprador, en los tres idiomas. Sólo se pintan las secciones que trae el
Resource público (lo privado no llega ni se oculta con CSS). Rodeo en rangos, sanidad sin datos individuales,
trazabilidad con % de integridad registrada e insignias sólo por hechos medibles. La primera publicación exige
aceptar la vista previa; las secciones derivadas se pueden congelar. Leyenda fija en el pie con el texto del Resource.

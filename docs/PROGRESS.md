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

## TPA-41 · Página pública de verificación · ✅ (web)

**Rutas:** `/[locale]/v/[huella]` (resultado), `/[locale]/v` (buscar huella o verificar archivo), `/api/verificaciones/[huella]/prueba` (descarga de prueba.json, server-side)

| Pieza | Endpoint | Estado |
|---|---|---|
| Registro por huella (qué, cuándo, quién por rol, versiones, nivel, anclaje, eslabón) | `GET /public/verificaciones/{huella}` | 🧪 mock (huellas de ofertas/documentos de ejemplo) |
| Prueba descargable | `GET /public/verificaciones/{huella}/prueba` | 🧪 mock vía route handler |
| Verificar un archivo | SHA-256 con WebCrypto en el navegador → `GET /public/verificaciones/archivo/{sha256}` | 🧪 si no existe: «no coincide» marcado como demostración |

**Comentario del dev:** La huella del archivo se calcula en el navegador (WebCrypto) y sólo viaja el SHA-256: el
archivo nunca se sube. La página dice explícitamente qué prueba (que el registro no cambió desde la fecha) y qué
no (veracidad, habilitaciones); muestra correcciones con transparencia («tuvo N correcciones · esta es / NO es la
vigente») y el anclaje con su red y fecha. Las verificaciones no se indexan. Huella inválida o inexistente: estado
claro con buscador y verificación de archivo como salida.

## TPA-18 · Listado de hacienda con búsqueda y filtros · ✅ (web)

**Ruta:** `/hacienda` (+ `?q, especie, categoria, lote_id, potrero_id, estado_reproductivo, sanidad, sugerencia_categoria, orden, cursor`)

| Pieza | Endpoint | Estado |
|---|---|---|
| Listado, búsqueda por cualquier identificador, filtros, orden | `GET …/animales` (cursor) | 🔌 API real (seeder demo: 44 animales) |
| Potreros y lotes para filtros | `GET …/potreros` (lotes desde `ocupacion`) | 🔌 |
| Nombres de categorías y razas | `GET /catalogos` (cache 1 h, fallback estático) | 🔌 |
| Evento grupal desde la selección: traslado de potrero | `POST …/eventos` (`hacienda.traslado`, `sujetos.animal_ids`) con `422 requiere_confirmacion` → «Guardar igual» | 🔌 (no ejecutado contra el demo para no alterar sus datos) |

**Comentario del dev:** Paginado server-side por cursor opaco (Anteriores/Siguientes) y filtros en la URL; además se
recuerdan en el navegador y se restauran al volver a Hacienda («Limpiar todo» los borra). La tabla muestra
categoría con recategorización sugerida, peso con fecha, lote y potrero, estado reproductivo con fecha probable de
parto y retiro vigente, siempre con texto. La selección múltiple abre una barra fija con el evento grupal; las
advertencias de coherencia de la API se muestran y se confirman, nunca se pisan. Sin mocks: si la API cae, el
error boundary del panel explica y ofrece reintentar.

## TPA-17 · Ficha del animal con timeline · ✅ (web)

**Ruta:** `/hacienda/[id]?tab=resumen|timeline|sanidad|reproduccion|documentos|genealogia`

| Pieza | Endpoint | Estado |
|---|---|---|
| Encabezado (identificadores, especie, raza, categoría, edad, peso con fecha, GDP, estados) | `GET …/animales/{id}` | 🔌 API real |
| Timeline por módulo, con anulados opcionales y «Eventos anteriores» | `GET …/animales/{id}/eventos?modulo=&incluir_anulados=&cursor=` | 🔌 |
| Genealogía | `GET …/animales/{id}/genealogia` | 🔌 |
| Documentos vinculados | `GET …/animales/{id}/documentos` | 🔌 (el demo no tiene documentos: estado vacío con salida) |

**Comentario del dev:** La ficha es la historia del animal: timeline agrupado por mes, cada evento con ícono por
módulo, autor y rol, fecha y nivel de confianza; las correcciones («Corregido · v2», «Tiene una versión más nueva») y
anulaciones (tachadas) se muestran, nunca se esconden. Resumen con datos de la proyección (nacimiento estimado,
origen, dentición, CC, lote/potrero, clase de faena Res. 470/2012, señas). Sanidad muestra el retiro vigente con
fecha; Reproducción, FPP con su fuente (tacto/servicio). Foto: placeholder sobrio hasta que la app suba fotos.

## TPA-52 · Inicio con existencias, pendientes y actividad · ✅ (web)

**Ruta:** `/inicio` (estructura de la preview 01)

| Pieza | Endpoint | Estado |
|---|---|---|
| Todo el inicio | `GET …/inicio` | se usa si existe (hoy 404) |
| KPIs: cabezas en potreros, bovinos/bubalinos identificados, preñadas y partos en 30 días | `GET …/potreros` (ocupación) + `GET …/animales` | 🔌 compuesto con datos reales |
| Existencias por categoría | `GET …/animales` (identificados) → `…/inicio.existencias` cuando exista | 🔌 parcial: no incluye lotes anónimos (se aclara en pantalla) |
| Pendientes: partos vencidos/próximos, retiro vigente, recategorizaciones | derivados de `GET …/animales` | 🔌 |
| Actividad reciente con autor y rol | `GET …/eventos?limit=8` | 🔌 |

**Comentario del dev:** Mientras `/inicio` no exista, el tablero se compone sólo con endpoints reales y no inventa
nada: sin deltas «vs. mes anterior» (no hay dato), y la tarjeta de existencias aclara que cuenta animales
identificados. Cada KPI y pendiente lleva al listado de Hacienda ya filtrado. Se eliminó la maqueta `lib/mock.ts`.
Siguiendo las decisiones de Claude Design, no aparece «Renovar en SENASA» (no hay integración) y los pendientes de
documentos van a decir «Pedí la nueva constancia» cuando la API los publique.

### Ajustes por decisiones de Claude Design (brain/design/claude-design.md)
- **Duda 12** (TPA-48): la ficha pública ya no dice «Sanidad al día» (es una conclusión no verificada); muestra «Vacunas cargadas: aftosa, rabia…» en es/en/pt.
- **Duda 21** (TPA-48): la columna y el contador de consultas sólo se ven con `consultas.ver` (el encargado no ve consultas que pueden traer precios).
- **Duda 24** (TPA-54): el directorio vacío ofrece «Publicar un Busco» y «Seguir esta zona».

## TPA-11 · Invitar usuarios al establecimiento con roles · ✅ (web)

**Rutas:** `/configuracion` (hub), `/configuracion/usuarios` (equipo, invitaciones, matriz), `/invitacion/[token]` (aceptar)

| Pieza | Endpoint | Estado |
|---|---|---|
| Equipo con rol | `GET …/membresias?estado=activa` | 🔌 API real |
| Invitar por email o teléfono con rol; enlace + WhatsApp (sólo en la creación) | `POST …/invitaciones` | 🔌 probado |
| Invitaciones pendientes / revocar | `GET …/invitaciones`, `POST …/invitaciones/{id}/revocar` | 🔌 probado |
| Cambiar rol / revocar acceso | `POST …/membresias/{id}/rol`, `POST …/membresias/{id}/revocar` | 🔌 (revocar probado) |
| Ver invitación sin sesión y aceptar | `GET /public/invitaciones/{token}`, `POST /invitaciones/{token}/aceptar` | 🔌 probado end-to-end (registro → aceptar → entra como Asesor) |

**Comentario del dev:** Matriz de permisos legible con texto + ícono en cada celda (functional/04 §12), resaltando
la columna del rol propio; quien no gestiona usuarios ve sólo la matriz y qué le permite su rol. La invitación muestra
el enlace una única vez (la API no guarda el token) con «Mandar por WhatsApp». El invitado sin cuenta se registra o
ingresa con `next` y vuelve a aceptar; al aceptar, ese campo queda activo. Dueño y uno mismo no se pueden editar
desde la tabla. Las pruebas contra el demo se revirtieron (membresía e invitación revocadas).

## TPA-56 · Contrato a futuro con token (productor) · ✅ (web)

**Rutas:** `/comercializacion/contratos` (Mi apalancamiento), `/comercializacion/contratos/nuevo?lote=` (calculadora), `/comercializacion/contratos/[id]` (tomas, versiones, mortalidad, entrega, cancelar)

| Pieza | Endpoint | Estado |
|---|---|---|
| Lotes para tokenizar | `GET …/lotes` | 🔌 API real (apareció durante la noche) |
| Calcular / crear / publicar | `POST …/contratos/calcular`, `POST …/contratos`, `POST …/publicar` | 🧪 mock en memoria; cálculo en vivo en `lib/contratos-calc.ts` |
| Tomas y «recibí» | `GET …/contratos/{id}`, `POST …/tomas/{t}/confirmar-pago` | 🧪 |
| Mortalidad → versión nueva con recorte prorrata y anticipo a devolver | `POST …/contratos/{id}/terminos` | 🧪 (probado: 45 tokens tomados → 33; 30→22 y 15→11 con devolución) |
| Entrega y liquidación (± tolerancia, «a resolver») | `POST …/entrega` | 🧪 |
| Mi apalancamiento | `GET …/apalancamiento` | 🧪 calculado desde los contratos |
| Cancelar con motivo | `POST …/cancelar` | 🧪 |

**Comentario del dev:** La calculadora muestra la fórmula completa (cab × peso × rinde → kg al gancho → tokens de
100 kg con redondeo hacia abajo; el resto queda del productor) como pidió Claude Design (dudas 4 y 5). Precios y
anticipos sólo con `comercial.precios`; el resto del equipo ve tokens y fechas. Cada versión de términos queda con
su huella y enlace a verificación; nada se borra (la toma liberada sigue visible). Al ofertar o tokenizar un lote real
mientras la API no tenga esos módulos, el borrador se arma con los datos del lote real.

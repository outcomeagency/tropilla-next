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
| Búsqueda y filtros (provincia, especie, raza, categoría, con oferta, con contrato) + «Ver más» por cursor | `GET /public/directorio` | 🔌 API real (mock retirado) |
| Conteos en los filtros (provincias, razas, categorías, con oferta/contrato) | `GET /public/directorio/facetas` | 🔌 (si falla, los filtros usan el catálogo estático sin conteo) |
| Sitemap con hreflang (`/o/{codigo}` de la API → `/ofertas/{codigo}`) | `GET /public/sitemap` | 🔌 (sin API: sólo portada y directorio) |
| Portada: productores destacados + tarjeta «Sumá tu campo» si hay menos de 3 | `GET /public/directorio?limit=3` | 🔌 |
| Nombres de categorías y razas es/en/pt | facetas de la API; `lib/catalogo.ts` como respaldo | 🔌 |

**Comentario del dev:** Filtros en la URL (compartibles, indexables, funcionan sin JS; con JS se aplican al cambiar).
Datos cacheados con `"use cache"` + `cacheTag("directorio")` para revalidar por tag al publicar. Las tarjetas muestran
sólo zona general (departamento + provincia), especie con chip, razas, ofertas/contratos y frescura; el orden lo
explica la propia página («nadie paga por aparecer primero»). Metadata, canonical y alternates por idioma; la
leyenda fija va en el pie de todo lo público. Fotos de campo de licencia libre (búfalo de agua, nunca africano).
**Conexión a la API (2026-10-16):** se retiró el mock: el directorio, los conteos y el sitemap salen de la API real. El directorio,
las portadas de perfil/oferta y las tarjetas de oferta consumen `Foto` con URL pública, texto alternativo y dimensiones; el panel
muestra las fotos privadas firmadas del perfil, la oferta, el animal y el perfil profesional. La primera foto del perfil interno es
la portada; el perfil profesional conserva `foto_sha256` al guardar y pinta la foto pública localizada. No se copia ningún dato
privado a la página pública. Si no hay foto se conserva un placeholder sobrio, sin stock ni datos falsos. La portada toma una foto
real de un productor destacado. Si la API no responde, `app/[locale]/error.tsx` explica el problema en su idioma.

## TPA-45 · Simulador de liquidación en pie vs al gancho · ✅ (web)

**Rutas:** `/comercializacion/simulador` (pestaña privada «Simulador»).

| Pieza | Endpoint | Estado |
|---|---|---|
| Cuenta editable para bovinos y búfalos, con defaults del catálogo | `GET /catalogos` | 🔌 API real |
| Resultado en pie y al gancho, neto total y por kg vivo, conviene y fórmula del servidor | `POST …/simulaciones/calcular` | 🔌 API real |
| Guardar simulaciones para comparar | `POST …/simulaciones`; listado `GET …/simulaciones` | 🔌 API real |

**Comentario del dev:** Se puede comparar antes de registrar una operación; el guardado es opcional. La pantalla muestra ambas
liquidaciones lado a lado, incluidos IVA informativo, gastos, neto total y neto por kg vivo. La fórmula visible se toma del campo
`formula` de la API y la misma API calcula los importes. El desbaste se aplica sólo en pie; el rendimiento al gancho, sobre el peso
bruto; los kilos se redondean antes de multiplicar por el precio. Precios y simulaciones quedan restringidos al dueño/admin; no hay mock.

## TPA-46 · Registrar venta con condiciones del trato · ✅ (web)

**Rutas:** `/comercializacion/ventas` (listado privado), `/comercializacion/ventas/nueva` (trato y liquidación).

| Pieza | Endpoint | Estado |
|---|---|---|
| Comprador, destino, categoría, cantidad, pesada, modalidad, precio, plazo, tolerancias y gastos | `POST …/operaciones` (`tipo=venta`) | 🔌 API real |
| DT-e, tropa, RENSPA declarados, con privacidad del lado servidor | `trato` de `OperacionInput` | 🔌 API real |
| Resumen PDF del trato con huella | `generar_pdf: true` → `documento_id` | 🔌 API real |
| Listado de operaciones con importes | `GET …/operaciones?tipo=venta` | 🔌 API real |

**Comentario del dev:** El formulario conserva por escrito las condiciones que acuerdan comprador y productor, incluida la pesada y
quién paga el flete. El servidor vuelve a validar compromisos y avisos sanitarios; las advertencias se confirman antes de registrar.
El resumen PDF se genera en la API y queda enlazado desde Documentos. La lista y el formulario requieren `comercial.precios`.
Importes, DT-e, tropa y RENSPA no se envían a ninguna vista pública; la integración usa la API real, sin datos de muestra.

## TPA-47 · Historial de precios propio · ✅ (web)

**Rutas:** `/comercializacion/precios` (filtros, operaciones, diferenciales y referencias propias).

| Pieza | Endpoint | Estado |
|---|---|---|
| Precio por operación, especie, categoría y modalidad | `GET …/precios/historial` | 🔌 API real |
| Diferencial por operación y promedio contra referencia declarada | `GET …/precios/historial?referencia=` | 🔌 API real |
| Cargar referencias propias (descripción, fuente, precio y fecha) | `GET/POST …/precios-referencia` | 🔌 API real |

**Comentario del dev:** El historial junta los importes de las ventas registradas y permite filtrar por especie y categoría. Cada
operación muestra modalidad, precio obtenido y precio de referencia para distinguir pie de gancho. El diferencial por operación y
el promedio vienen calculados por la API; la referencia puede llamarse, por ejemplo, «novillo overo». Sólo dueño y administración
pueden consultar o cargar estos valores. No hay mock ni exposición en rutas públicas.

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
| Perfil público (slug viejo → 301 de la API → redirect permanente al nuevo) | `GET /public/establecimientos/{slug}` | 🔌 API real (mock retirado) |
| Configuración (secciones, slug, directorio, textos por idioma: título/descripción/historia, ubicación pública, contacto visible) | `GET/PATCH …/perfil` (`textos.{es,en,pt}`, secciones fusionadas con lo actual) | 🔌 probado en el campo de prueba |
| Completitud con «qué falta» accionable (enlace a dónde completarlo) | `…/perfil` (`completitud`, `faltantes`) | 🔌 |
| Vista previa obligatoria | `GET …/perfil/preview`, `POST …/preview/aceptar` | 🔌; «Publicar» deshabilitado hasta aceptar |
| Publicar / despublicar (email sin verificar → aviso) | `POST …/perfil/publicar|despublicar` + `revalidateTag("perfil:<slug>")` | 🔌 |
| Congelar sección derivada | `POST …/secciones/{s}/congelar|descongelar` | 🔌 |
| Fotos del perfil | `perfil.fotos` (hashes de `/archivos`) | ⬜ sin pantalla de subida en la web todavía (las fotos llegan desde la app) |

**Comentario del dev:** Un solo componente (`PerfilView`) arma el perfil público y la vista previa del panel: el
productor ve exactamente lo que ve el comprador, en los tres idiomas. Sólo se pintan las secciones que trae el
Resource público (lo privado no llega ni se oculta con CSS). Rodeo en rangos, sanidad sin datos individuales,
trazabilidad con % de integridad registrada e insignias sólo por hechos medibles. La primera publicación exige
aceptar la vista previa; las secciones derivadas se pueden congelar. Leyenda fija en el pie con el texto del Resource.
**Conexión a la API (2026-10-16):** se retiraron los mocks (`lib/mock/perfiles.ts`, `perfil-panel.ts`). Al conectar aparecieron
desvíos que el mock escondía: los textos son por idioma (`textos.es.titulo/descripcion/historia`, no un `historia` suelto), la
sección se llama `oferta` y `contacto_visible` no admite `formulario`. El editor ahora tiene título y descripción por idioma (la
descripción alimenta Google y la completitud), «qué falta» lleva a dónde completarlo, y el perfil sin fotos arranca directo por el
nombre en vez de una caja vacía; sanidad vacía y rodeo sin hacienda se explican o no se muestran.

## TPA-41 · Página pública de verificación · ✅ (web)

**Rutas:** `/[locale]/v/[huella]` (resultado), `/[locale]/v` (buscar huella o verificar archivo), `/api/verificaciones/[huella]/prueba` (descarga de prueba.json, server-side)

| Pieza | Endpoint | Estado |
|---|---|---|
| Registro por huella (qué, cuándo, quién por rol, versiones, nivel, anclaje, eslabón) + «Ver lo que se registró» (sobre canónico) | `GET /public/verificaciones/{huella}` | 🔌 API real (mock retirado) |
| Prueba descargable | `GET /public/verificaciones/{huella}/prueba` vía route handler | 🔌 |
| Verificar un archivo | SHA-256 con WebCrypto en el navegador → `GET /public/verificaciones/archivo/{sha256}` | 🔌 («No coincide» real, sin modo demo) |

**Comentario del dev:** La huella del archivo se calcula en el navegador (WebCrypto) y sólo viaja el SHA-256: el
archivo nunca se sube. La página dice explícitamente qué prueba (que el registro no cambió desde la fecha) y qué
no (veracidad, habilitaciones); muestra correcciones con transparencia («tuvo N correcciones · esta es / NO es la
vigente») y el anclaje con su red y fecha. Las verificaciones no se indexan. Huella inválida o inexistente: estado
claro con buscador y verificación de archivo como salida.
**Conexión a la API (2026-10-16):** sin mocks. Con datos reales se corrigió que el rol saliera crudo («dueno» → «Dueño/Owner/
Proprietário») y que la tarjeta explicativa dijera «Integridad registrada» en verde sobre un registro sólo declarado (ahora
«Qué prueba» / «Qué no prueba», neutras). Se suma «Ver lo que se registró»: el sobre exacto que se hasheó, para quien quiera
recalcular la huella por su cuenta.

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

## TPA-57 · Cuenta de comprador y toma de tokens · 🟦 parcial (web)

**Rutas:** `/[locale]/contratos/[codigo]` (público es/en/pt), `/comprador/cuenta` (cuenta liviana), `/comprador` (Mis contratos); el perfil público lista sus contratos abiertos.

| Pieza | Endpoint | Estado |
|---|---|---|
| Contrato público; precio especial y anticipo sólo con cuenta de comprador | `GET /public/contratos/{codigo}` (sesión opcional) | 🧪 mock (CF0007) |
| Cuenta liviana (empresa, país, tipo, volumen) | `PUT /me/comprador` | 🧪 mock en memoria por usuario |
| Tomar N tokens ≤ libres, con anticipo calculado e `Idempotency-Key`; exige email verificado | `POST /contratos/{codigo}/tomas` (409 `tokens_insuficientes`) | 🧪 |
| Mis contratos, datos de cobro tras reservar, «Pagué» | `GET /comprador/tomas`, `POST /comprador/tomas/{t}/pago-informado` | 🧪 |
| Seguir productores con aviso | `POST /seguimientos` | ⬜ pendiente (sin pantalla todavía) |

**Comentario del dev:** El precio especial es la única excepción a «precios privados» y la web la respeta: sin cuenta
de comprador se ve un bloque bloqueado que explica por qué y ofrece crear la cuenta (con `next` para volver al
contrato). Con cuenta, el selector de tokens calcula kg y anticipo en vivo; los datos de cobro del productor se
muestran recién después de reservar (Claude Design, duda 8) y el pago es fuera de TROPILLA. Falta «Seguir
productores» y el vencimiento de 2 días hábiles propuesto por Claude Design (duda 7) depende de la API.

## TPA-13 · Datos del establecimiento y zonas sanitarias · ✅ (web)

**Rutas:** `/establecimiento` (ficha: encabezado con mapa, productor, instalaciones, historia, zonas sanitarias), `/establecimiento/editar` (formulario por secciones con barra fija de guardado)

| Pieza | Endpoint | Estado |
|---|---|---|
| Ficha y edición (datos, superficie, actividades, especies, instalaciones, historia, zonas) | `GET/PATCH /establecimientos/{e}` (`row_version`, 409 → mensaje) | 🔌 API real (probado con un establecimiento propio de prueba) |
| Productor (razón social, CUIT, contacto) | `GET/PATCH /productores/{p}` | 🔌 (sólo con `establecimiento.ver_privados`) |
| Garrapata sugerida por departamento | `GET /catalogos` → `geo.departamentos[].garrapata_sugerida` | 🔌 (Corrientes; el resto del NEA desde `lib/geo.ts`) |
| Ubicación por punto (privada) | `ubicacion {lat, lon}` decimal canónico | 🔌 mapa Leaflet + teselas OSM / satélite Esri |
| Interdicción / levantamiento | `POST …/eventos` (`establecimiento.interdiccion`, `…levantamiento_interdiccion`) → `interdiccion_vigente` | 🔌 probado |

**Piezas nuevas reutilizables:** `components/dialog.tsx` (modal nativo), `components/panel/form-state.tsx` (`useActionForm`/`useDialogForm` con idempotencia y «Guardar igual» para advertencias), `lib/eventos-api.ts` (`postEvento`, `estadoDeError`, decimales canónicos), `components/map/campo-map.tsx` (punto, polígonos y dibujo; trazos con tokens vía clases `.tp-*` en `globals.css`). `npm run api:types` ahora lee `../tropilla-api/docs/openapi-v1.yaml` (incluye los desvíos aditivos de la API).

**Comentario del dev:** La ficha arranca con lo que el productor reconoce de un vistazo: nombre, paraje, especies y el campo en satélite; lo privado (CUIT, RENSPA, ubicación) lleva candado y desaparece para quien no tiene `ver_privados`.
Las zonas sanitarias se muestran como estados con ícono + texto y explican para qué sirven (arman el plan sugerido). La garrapata
sugerida por departamento sale del catálogo de la API y se ofrece con un clic, nunca se impone. La interdicción es un evento
(queda en la historia con autor), no un tilde. Los decimales viajan canónicos (`-27.7`, no `-27.70`): la API rechaza ceros sobrantes.

## TPA-14 · Potreros · ✅ (web)

**Rutas:** `/establecimiento/potreros` (KPIs, mapa satelital con contornos y tabla de ocupación; `?archivados=1`), `/establecimiento/potreros/nuevo`, `/establecimiento/potreros/[id]` (quién está ahora por lote y categoría + edición + archivar)

| Pieza | Endpoint | Estado |
|---|---|---|
| Listado con ocupación derivada | `GET …/potreros?archivados=` | 🔌 API real |
| Crear / editar (nombre, ha, ambiente, forraje, agua, revolcadero, notas, contorno) | `POST/PATCH …/potreros` (`poligono` GeoJSON, desvío aditivo de la API) | 🔌 probado con dibujo en el establecimiento de prueba |
| Composición por lote y categoría | `GET …/lotes` (filtrado por `potrero.id`) | 🔌 |
| Archivar con motivo | `POST …/potreros/{id}/archivar` | 🔌 |
| Consulta offline | — | es de la app (Flutter) |

**Comentario del dev:** El contorno se dibuja tocando las esquinas sobre la imagen satelital (Leaflet + Esri/OSM, sin plugins): las hectáreas
se calculan en vivo y se pueden pisar a mano; los otros potreros quedan punteados como referencia para no superponer. En el listado el mapa
muestra nombre y cabezas (las etiquetas se ocultan al alejarse para que no se pisen) y un clic abre la ficha. La ficha arranca por lo que el
encargado necesita: quién está ahora, por lote y categoría, con carga cab/ha. Archivar pide motivo y avisa si todavía hay hacienda; nada se borra.

## TPA-19 · Identificaciones múltiples por animal · ✅ (web)

**Rutas:** `/hacienda/[id]?tab=identificaciones` (vigentes, historial, agregar/reponer/retirar); el encabezado de la ficha enlaza ahí

| Pieza | Endpoint | Estado |
|---|---|---|
| Vigentes y retiradas (tipo, valor, entidad/tipo de registro, colocada/retirada, en conflicto) | `GET …/animales/{id}` → `identificaciones[]` | 🔌 API real |
| Agregar, reponer y retirar (motivo en `observaciones`) | `POST …/eventos` `hacienda.identificacion` (`colocacion`/`reposicion`/`retiro` + `reemplaza`) | 🔌 probado en el establecimiento de prueba |
| Historial con motivo, autor y «reemplazada por» | `GET …/animales/{id}/eventos?tipo=hacienda.identificacion` + `GET …/eventos/{id}` | 🔌 |
| Duplicado vigente → aviso con «Abrir ficha» | 409 `identificacion_duplicada` + `GET …/animales/identificador?valor=&tipo=` | 🔌 probado |
| Tatuaje sin prefijo de raza (E/U/A) | 422 `requiere_confirmacion` → «Guardar igual» | 🔌 probado |

**Comentario del dev:** Los seis tipos salen del enum del contrato (`/catalogos` no los trae) y el prefijo de tatuaje de `razas.prefijo_tatuaje`.
Agregar un tipo único que ya tiene vigente se manda como reposición (con aviso y motivo) para que la anterior quede en el historial; marca y
registro admiten varias. El RFID valida 15 dígitos con contador en vivo y bloquea el Enter del bastón (modo teclado) hasta completarlos.
El payload no tiene motivo: viaja en `observaciones` («Motivo: …») y el historial lo cruza con los eventos. `useActionForm`/`useDialogForm`
ahora son genéricos para estados extendidos. El timeline muestra «Reposición: Caravana visual 0501B» en vez del resumen crudo de la API.

## TPA-20 · Lotes de manejo y lotes anónimos · ✅ (web)

**Rutas:** `/hacienda/lotes` (pestaña «Lotes» de Hacienda: KPIs, filtros por tipo/especie, archivados), `/hacienda/lotes/nuevo`, `/hacienda/lotes/[id]` (composición por categoría, manejo grupal, animales identificados, historia). Hacienda suma la pestaña «Animales | Lotes» y la acción «Cambiar de lote»; el potrero y la ficha del animal enlazan al lote.

| Pieza | Endpoint | Estado |
|---|---|---|
| Listado con composición, potrero y peso promedio; archivados | `GET …/lotes?especie=&archivados=` | 🔌 API real |
| Alta (especie única, propósito, por cantidades o identificado) + conteo inicial + potrero | `POST …/lotes` (id del cliente) + `POST …/eventos` `hacienda.alta` (lote/conteo) y `hacienda.traslado` | 🔌 probado en el establecimiento de prueba |
| Editar (nombre, propósito, por cantidades, notas) | `PATCH …/lotes/{id}` (`row_version`, 409 → mensaje) | 🔌 probado |
| Archivar con motivo (sólo vacío) | `POST …/lotes/{id}/archivar` | 🔌 probado |
| Ficha y timeline del lote (cursor) | `GET …/lotes/{id}`, `GET …/lotes/{id}/eventos` | 🔌 |
| Eventos grupales: mover de potrero, sumar cabezas, pesaje promedio, baja (muerte/salida) por conteo | `POST …/eventos` (`hacienda.traslado`, `.alta`, `.pesaje` modo promedio, `.muerte`, `.egreso`) | 🔌 probados (GDP del lote calculada por la API) |
| Individualizar desde lote anónimo (hereda historia) | `POST …/eventos` `hacienda.individualizacion` (`sujetos.conteo` = animales nuevos) | 🔌 probado: 3 bucerras, la ficha muestra «Heredado del lote» |
| Cambio de lote de animales identificados (selección) | `POST …/eventos` `hacienda.cambio_lote` | 🔌 probado |

**Comentario del dev:** Los lotes viven como pestaña de Hacienda (no en la nav lateral): «Animales» para lo caravaneado, «Lotes» para el manejo por grupo; la composición reutiliza las celdas de la ficha de potrero. Potrero, conteo y pesos son eventos, nunca campos: al crear un lote por cantidades el conteo inicial y el potrero se registran como alta + traslado (si fallan, el lote queda y la ficha avisa qué falta). Las bajas validan que no salgan más cabezas que las del conteo (la API no lo bloquea: abriría una revisión `conteo_negativo`). Individualizar crea hasta 50 animales por vez con caravana visual opcional; el sexo sale de la categoría. Pendientes: la API no tiene un evento para pasar cabezas *anónimas* de un lote a otro (sólo `cambio_lote` de animales) ni recategorización por conteo en la UI; el resumen del traslado de lote dice «Traslado de 0 cabezas» (lo arma la API); «Ofertar este lote» lleva al selector de ofertas sin preseleccionar.

## TPA-21 · Carga inicial de stock por planilla · ✅ (web)

**Rutas:** `/hacienda/importar` (pasos, plantillas por especie, subida y referencia de columnas; aviso «Tenés una planilla sin confirmar»), `/hacienda/importar/[id]` (revisando → revisión editable → importando → resultado / cancelada), `/hacienda/importar/plantilla?especie=` (descarga). Entradas: botón «Importar planilla» en Hacienda, estado vacío de Hacienda y «Subir mi planilla» de `/bienvenida/listo` («Cargar por cantidades» ahora va a `/hacienda/lotes/nuevo`).

| Pieza | Endpoint | Estado |
|---|---|---|
| Plantilla descargable (CSV con BOM y `;` para Excel en español) | `GET /importaciones/plantilla?especie=&formato=csv` vía route handler | 🔌 real |
| Subida CSV/XLSX ≤ 10 MB (Server Action, multipart server-side; `bodySizeLimit` y `proxyClientMaxBodySize` 11 MB) | `POST …/importaciones` (multipart, desvío aditivo) → 202 + polling | 🔌 probado con CSV y XLSX |
| Estado y previsualización por fila (todas las filas por cursor, hasta 3.000) | `GET …/importaciones/{id}`, `GET …/importaciones/{id}/filas` | 🔌 |
| Corregir fila en línea / descartar / volver a incluir | `PATCH …/filas/{numero}` (`datos` = columnas de la planilla, `accion`) | 🔌 probado |
| Confirmar (un `hacienda.alta` por fila válida) y resultado con filas que quedaron afuera | `POST …/confirmar` → 202 + polling | 🔌 probado: 6 altas en el establecimiento de prueba |
| Cancelar | `POST …/cancelar` | 🔌 probado |
| Alternativa lote anónimo por categoría | `/hacienda/lotes/nuevo` (TPA-20) | 🔌 |

**Comentario del dev:** La API guarda cada fila ya normalizada y descarta lo que no entiende («Vaquillona» para búfalos, «2020-02-30»), así que para corregir el navegador lee el CSV al elegirlo y guarda lo escrito en `localStorage`: la celda en error muestra el valor original y el editor lo precarga; con XLSX (o en otro navegador) la celda dice «Falta». Lo ideal es que la API devuelva el valor original por fila (pedido para api). El editor rearma la fila completa (códigos → nombres, ids de lote/potrero → nombres) porque el PATCH revalida desde cero.
Probado de punta a punta en «Campo de Prueba Web» con una planilla con RFID corto, categoría que no corresponde al sexo, categoría inexistente, fecha futura e inválida, caravana repetida, sexo «X», potrero y lote inexistentes y una fila sin identificación: 3 filas corregidas en línea, 1 descartada, 1 dejada con error; se importaron 6 y el resultado lista las 2 que quedaron afuera. También XLSX y cancelar.
Confirmar con filas en error importa sólo las válidas (así lo hace la API) y el diálogo avisa que esas filas no se pueden importar después desde la misma planilla. No hay listado de importaciones en la API: la última sin confirmar se recuerda en la cookie `tropilla_imp`.

## TPA-22 · Eventos de hacienda · ✅ (web)

**Rutas:** `/hacienda/eventos` (registro del establecimiento, pestaña «Eventos» de Hacienda; `?modulo, tipo, desde, hasta, cursor`), `/hacienda/eventos/nuevo?tipo=&animales=id,id&lote=` (registrar), `/hacienda/eventos/[id]` (detalle). Accesos: «Registrar evento» en la ficha del animal y «Otro evento» en la barra de selección de `/hacienda`.

| Pieza | Endpoint | Estado |
|---|---|---|
| Registro filtrable con autor, rol, confianza, corregido/anulado, agrupado por mes | `GET …/eventos` (cursor) | 🔌 API real |
| Registrar: ingreso/compra (por conteo a un lote o animales nuevos con caravana), nacimiento, traslado, cambio de lote, egreso/venta, castración, dentición, condición corporal, recategorización manual, muerte, pérdida/robo, faena | `POST …/eventos` (JSON Schema v1 por tipo) + `422 requiere_confirmacion` → «Guardar igual» | 🔌 probado en el campo de prueba (CC, ingreso con caravana, muerte por conteo sobre lote) |
| Sumar animales por cualquier identificador | `GET …/animales/identificador` | 🔌 |
| Detalle: datos legibles (ids → nombres de potrero/lote/categoría/causa), sujetos, versiones | `GET …/eventos/{id}` | 🔌 |
| Integridad: huella, eslabón, anclaje y enlace a la verificación pública | `GET …/eventos/{id}/integridad` | 🔌 (anclaje: «pendiente» hasta que la API ancle) |

**Comentario del dev:** El alta de eventos es una sola pantalla en tres pasos (qué pasó → a quiénes → datos) con un resumen fijo a la
derecha que dice qué se va a guardar; los formularios salen del catálogo de `functional/02 §2.1`, nunca JSON crudo. Un evento va sobre
animales identificados (buscados por caravana/RFID/tatuaje o traídos desde la selección del listado) o sobre un lote, con conteo por
categoría y tope de lo que hay para las bajas. Las coherencias (posterior a una baja, especie, sexo) las valida la API y se confirman con
«Guardar igual»; los animales dados de baja ni se ofrecen. Identificación y pesaje no se duplican: viven en la ficha y en el lote (TPA-19/20/23).

## TPA-23 · Pesajes y ganancia diaria · ✅ (web)

**Rutas:** `/hacienda/pesajes` (pestaña «Pesajes»: sesión de pesada, GDP por lote, últimos pesajes; `?animal=` precarga uno), ficha del animal → Resumen → «Peso y ganancia diaria» (curva + tabla), promedio de lote en la ficha del lote (TPA-20).

| Pieza | Endpoint | Estado |
|---|---|---|
| Sesión de pesada: un `hacienda.pesaje` individual por animal, método, desbaste | `POST …/eventos` (idempotente por fila) | 🔌 probado en el campo de prueba |
| Aviso > 30 % en < 30 días: en vivo en la fila y `422 requiere_confirmacion` (`pesaje_atipico`) → «Guardar igual» | `POST …/eventos` | 🔌 probado (40 % en 15 días) |
| Peso anterior por animal | `GET …/animales/identificador` (`peso_kg`, `peso_fecha`) | 🔌 |
| Curva y GDP entre pesajes del animal (propios y heredados del lote) | `GET …/animales/{id}/eventos?tipo=hacienda.pesaje` (peso leído del `resumen`) | 🔌 |
| GDP promedio por lote | `GET …/lotes` (`peso_promedio_kg`, `gdp_promedio_kg_dia`) | 🔌 |

**Comentario del dev:** La pesada se carga como en la manga: caravana y Enter, peso y Enter, y salta a la fila siguiente; cada fila
muestra el peso anterior con su fecha y la ganancia diaria en vivo, y marca en amarillo si difiere más de 30 % en menos de 30 días.
Lo que la API advierte no se guarda hasta confirmarlo, y las filas ya guardadas salen de la lista (cada fila tiene su clave de
idempotencia: reintentar no duplica). La curva de la ficha es SVG propio con tokens; los promedios de lote heredados se distinguen
de los pesajes individuales. Pedido a la API: un endpoint de serie de pesos por animal evitaría leer el kg del `resumen`.

## TPA-25 · Recategorización sugerida · ✅ (web)

**Rutas:** `/hacienda/recategorizacion` (accesos: pendiente de Inicio y «Confirmar sugerencias en bloque» en los filtros de Hacienda)

| Pieza | Endpoint | Estado |
|---|---|---|
| Sugerencias agrupadas por cambio (Bucerra → Bubilla) con motivo | `GET …/animales?sugerencia_categoria=1` + `reglas_categoria` de `GET /catalogos` | 🔌 API real |
| Confirmación en bloque con fecha → un evento `hacienda.recategorizacion` por animal | `POST …/animales/recategorizar` | 🔌 probado en el campo de prueba |

**Comentario del dev:** Las sugerencias se agrupan por transición, con el motivo de la regla que la dispara (destete, parto, castración,
edad o dentición) tomado del catálogo de reglas, no de un `if especie`. Todo viene marcado y se destilda lo que no corresponde; la
barra fija dice cuántas se confirman y con qué fecha. Lo que no se confirma sigue sugerido (la API no tiene «descartar sugerencia»:
anotado como pedido). Al confirmar, Hacienda, Inicio y las existencias se revalidan.

## TPA-26 · Correcciones y anulaciones de eventos · ✅ (web)

**Rutas:** `/hacienda/eventos/[id]` («Corregir», «Anular» y la tarjeta «Ver cambios»), `/hacienda/eventos/[id]/corregir`. Desde la timeline de la ficha cada evento abre su detalle.

| Pieza | Endpoint | Estado |
|---|---|---|
| Corregir: versión nueva con motivo obligatorio; campos del payload según el JSON Schema del tipo (los no tocados se conservan) | `POST …/eventos/{id}/correcciones` (409 `version_no_vigente` → mensaje) | 🔌 probado (CC 3,5 → 3) |
| Anular con motivo | `POST …/eventos/{id}/anulaciones` | 🔌 probado |
| «Ver cambios»: versiones con autor, fecha, motivo y lo anterior tachado → lo nuevo | `GET …/eventos/{id}` (`versiones`) | 🔌 |
| Permiso por módulo (`hacienda.corregir`, `reproduccion.corregir`, `sanidad.corregir`) | `/auth/me` abilities | 🔌 |

**Comentario del dev:** El formulario de corrección se arma solo a partir del JSON Schema v1 de cada tipo (enum → lista, decimal →
número con coma, texto → área), así sirve para hacienda, reproducción y sanidad sin pantallas por tipo; las listas (animales de un
ingreso, crías) y los sujetos no se corrigen: se explica que eso se anula y se vuelve a cargar. El motivo es obligatorio y se ve en
«Ver cambios», donde cada campo cambiado aparece tachado con su valor nuevo al lado. Una versión vieja avisa que no es la vigente y
lleva a la actual; los anulados quedan tachados en el registro, la timeline y el detalle. Nada se borra.

## TPA-49 · Consultas de compradores · ✅ (web)

**Rutas:** `/comercializacion/consultas?estado=nueva|respondida|cerrada|todas&id=` (pestaña «Consultas» de Comercialización con el número de nuevas; sólo con `consultas.ver`)

| Pieza | Endpoint | Estado |
|---|---|---|
| Bandeja con estados, idioma, país, tipo de comprador, volumen y oferta de origen | `GET …/consultas?estado=` | 🔌 API real (las 2 del demo) |
| Responder por WhatsApp / email (mensaje prearmado en el idioma del comprador) → marca respondida con canal | `whatsapp_url`, `mailto_url` + `POST …/consultas/{id}/estado` | 🔌 |
| Cerrar, volver a nueva, spam, «ya la respondí por otro medio» | `POST …/consultas/{id}/estado` | 🔌 probado (cerrada → nueva sobre el demo, revertido) |
| Aviso por email al dueño/admin | lo manda la API (TPA-55) | 🔌 (push queda para la app) |

**Comentario del dev:** Bandeja de dos paneles (lista + detalle) que en el teléfono se vuelve lista → detalle con «Bandeja» para volver.
Las nuevas llevan punto y negrita; el detalle muestra el mensaje tal cual, en qué idioma escribió («Escribió en inglés») y la oferta
de origen. Responder abre WhatsApp o el correo del productor con el saludo que arma la API en el idioma del comprador y marca la consulta
como respondida con el canal: TROPILLA no intermedia ni guarda la conversación. El encargado no ve la pestaña (las consultas pueden traer precios).

## TPA-27 · Servicio natural e inseminación · ✅ (web)

**Rutas:** `/reproduccion/registrar?tipo=&animales=&lote=` (selector de Reproducción: servicio, diagnóstico, partos), acceso «Registrar» en la ficha → Reproducción. El detalle queda en `/hacienda/eventos/[id]`.

| Pieza | Endpoint | Estado |
|---|---|---|
| Servicio natural: vientres (animales o lote), inicio/fin, toros con caravana (sólo machos), lote de toros o de afuera | `POST …/eventos` (`reproduccion.servicio_natural`) | 🔌 probado (0501 con 0502 + toro del vecino) |
| IA / IATF: toro y raza del semen, centro, partida, inseminador | `POST …/eventos` (`reproduccion.inseminacion`, sólo hembras) | 🔌 probado |
| Estado «servida» y último servicio con su tipo en la ficha | `GET …/animales/{id}` (`servicio_fecha`, `servicio_tipo`) | 🔌 |

**Comentario del dev:** Reproducción usa el mismo «Registrar» de Hacienda (qué pasó → a quiénes → datos) con su propio selector, así
el equipo aprende una sola pantalla. Los toros se suman por caravana (la web rechaza hembras antes de mandar) o se describen si son
prestados; el semen lleva toro, raza (del catálogo por especie), centro y partida. El estado «servida» lo deriva la API y la ficha muestra
el último servicio con su tipo. El registrar se movió a un componente compartido (`registrar-pagina.tsx`) para Hacienda y Reproducción.

## TPA-28 · Tacto y fecha probable de parto · ✅ (web)

**Rutas:** `/reproduccion/tacto` (sesión de tacto «modo manga» en la web), `/reproduccion/registrar?tipo=reproduccion.tacto` (una o pocas hembras con FPP en vivo)

| Pieza | Endpoint | Estado |
|---|---|---|
| Tacto/ecografía: vacía o preñada, días o tamaño, veterinario | `POST …/eventos` (`reproduccion.tacto`, uno por hembra, idempotente por fila) | 🔌 probado: 0501 preñada 45 d → FPP 01/07/2027 (igual a la API) |
| Gestación por especie y raza (Murrah 303, Mediterránea 313, Jafarabadi 330, búfala 310, bovino 283) | `parametros.gestacion_media_dias` de `GET /catalogos` | 🔌 |
| FPP vigente y su fuente en la ficha | `GET …/animales/{id}` (`fecha_probable_parto`, `fpp_precision`, `dias_gestacion`) | 🔌 |

**Comentario del dev:** La sesión de tacto copia el ritmo de la manga: caravana ↵, tecla P o V, días ↵ y salta a la siguiente; los
machos y los animales dados de baja se rechazan en la fila. La fecha probable de parto se calcula en vivo con la gestación de la especie
y la raza de cada hembra (parámetros del catálogo, no constantes) y coincide con la que deriva la API. El pie lleva el % de preñez de la
sesión. Las advertencias de la API se confirman por fila con «Guardar igual», igual que en la pesada.

## TPA-29 · Parto, nacimiento, aborto y destete · ✅ (web)

**Rutas:** `/reproduccion/registrar?tipo=reproduccion.parto|aborto|destete&animales=` (grupo «Partos y destete»); el detalle del parto lista las crías con enlace a su ficha.

| Pieza | Endpoint | Estado |
|---|---|---|
| Parto: tipo y crías (viva/muerta, sexo, caravana, raza, peso); las vivas nacen con `madre_id`, lote y potrero de la madre y categoría de cría por especie y sexo | `POST …/eventos` (`reproduccion.parto`) | 🔌 probado (0501 → C-0501) |
| Gestación mínima por especie | `422 requiere_confirmacion` (`gestacion_corta`) → «Guardar igual», queda en el detalle | 🔌 probado |
| Aborto (días estimados, causa presunta) → vacía | `reproduccion.aborto` | 🔌 |
| Destete (tipo, peso, categoría nueva opcional) sobre crías o lote | `reproduccion.destete` | 🔌 |
| Nacimiento de madre sin caravana o de lote | `hacienda.nacimiento` (TPA-22) | 🔌 |

**Comentario del dev:** El parto se carga sobre una sola madre con sus crías en filas (mellizos con «agregar otra cría»); la cría viva
nace en el sistema vinculada a la madre y hereda su lote y potrero, y la muerta queda registrada en el parto sin crear animal. La categoría
de la cría no se elige: sale del catálogo (cría de la especie y el sexo). Si la gestación es más corta que el mínimo, la API lo advierte y
se confirma; el detalle muestra la advertencia confirmada en castellano y las crías con enlace a su ficha. El destete recategoriza por regla.

## TPA-30 · Tablero de vientres y calendario de partos · ✅ (web)

**Rutas:** `/reproduccion` (tablero: `?especie=BOV|BUB`), `/reproduccion/partos?mes=YYYY-MM&especie=&vencidos=1` (calendario mensual). Inicio lleva sus KPIs y pendientes de partos a estas pantallas.

| Pieza | Endpoint | Estado |
|---|---|---|
| Vientres por estado y especie (vacías, servidas, preñadas, paridas, sin datos), preñadas por mes de parto, próximos y vencidos | `GET …/reproduccion/tablero?especie=` | 🔌 API real |
| Calendario de partos probables por mes | `GET …/reproduccion/partos?desde=&hasta=&especie=` | 🔌 |
| Partos vencidos (FPP + 15 d sin parto) | `GET …/reproduccion/partos?vencidos=true` | 🔌 |
| Próximos 45 días + atrasados dentro de la tolerancia | `GET …/reproduccion/partos?vencidos=false&desde=&hasta=` | 🔌 |

**Comentario del dev:** El tablero arranca por lo urgente: si hay partos vencidos aparece arriba una franja roja con cada madre y
«Registrar parto». Debajo, KPIs con % de preñez, una barra apilada por especie (cada estado lleva al listado de Hacienda filtrado) y
un gráfico de partos esperados por mes apilado bovino/bubalino, donde los meses ya pasados se pintan en rojo. El calendario es una
grilla lunes–domingo con el conteo por día (verde, amarillo si está atrasado, rojo si venció) y al lado la lista del mes con la
fuente de la fecha (tacto/servicio). Sin mocks: todo sale de los dos endpoints de la API.

## TPA-31 · Catálogo de productos sanitarios · ✅ (web)

**Rutas:** `/sanidad/productos?tipo=&archivados=1` (pestaña «Productos» de Sanidad)

| Pieza | Endpoint | Estado |
|---|---|---|
| Catálogo con tipo, vía, enfermedades, especies, dosis declarada y retiro carne/leche | `GET …/productos-sanitarios?archivados=` | 🔌 API real |
| Alta desde la base sugerida (genéricos sin dosis ni retiro) o producto propio | `GET /catalogos/productos-sugeridos` + `POST …/productos-sanitarios` (`sugerido_codigo`) | 🔌 probado en el campo de prueba (Ivomec 1%) |
| Editar (row_version) / archivar con motivo | `PATCH …/productos-sanitarios/{id}`, `POST …/archivar` | 🔌 |
| Enfermedades y principios activos | `GET /catalogos` (`items.enfermedades`, `items.principios_activos`) | 🔌 |

**Comentario del dev:** El catálogo es la base de todo Sanidad: al registrar una aplicación se elige de acá y el retiro se calcula solo.
Por eso el dato más visible de cada fila es el retiro de carne/leche, y si un antiparasitario o antibiótico no lo tiene aparece «Falta
el retiro» con un aviso arriba que explica por qué importa. La base sugerida trae genéricos a propósito sin dosis ni retiro: el
diálogo lo dice y pide la marca y el marbete. La dosis es texto declarado («la indicada por el Dr. Pérez»): TROPILLA no prescribe.

## TPA-32 · Registrar aplicación sanitaria · ✅ (web)

**Rutas:** `/sanidad` (resumen: indicadores, últimos registros y atajos), `/sanidad/registrar?tipo=&animales=&lote=&potrero=&tarea=`; la ficha del animal → Sanidad suma «Registrar aplicación».

| Pieza | Endpoint | Estado |
|---|---|---|
| Vacunación (producto, enfermedad, n.º de dosis, vía, vacunador, campaña, envase) | `POST …/eventos` `sanidad.vacunacion` | 🔌 |
| Desparasitación (tipo, principio activo, dosificación por el más pesado, peso) | `POST …/eventos` `sanidad.desparasitacion` | 🔌 probado: lote «Bucerros 2026» con Ivomec 1 % (35 d) |
| Tratamiento (diagnóstico presuntivo, días, veterinario) | `POST …/eventos` `sanidad.tratamiento` | 🔌 |
| A animales, un lote o **un potrero** completo | `sujetos.tipo = animales | lote | potrero` | 🔌 |
| Cierra la tarea del plan | `payload.tarea_id` (precarga tipo, enfermedad, producto y lote/potrero de la tarea) | 🔌 (pantalla de tareas en TPA-33) |
| Modo manga (offline) | — | es de la app (Flutter) |

**Comentario del dev:** Sanidad usa el mismo «Registrar» de Hacienda y Reproducción (qué pasó → a quiénes → datos), sumando el
potrero como sujeto: vacunar «todo lo que está en Potrero Norte» es un solo paso. El producto sale del catálogo y precarga vía, dosis
declarada y retiro, editables porque manda el marbete del envase usado; abajo se lee en claro «No vender para faena hasta el
20/11/2026». El detalle del evento ya no muestra ids crudos (producto, tarea) y explica el sujeto potrero. Para la API: el `resumen`
de las vacunaciones del demo dice «— 0 cabezas» en las aplicadas a potrero/lote vacío.

## TPA-33 · Plan sanitario desde plantillas · ✅ (web)

**Rutas:** `/sanidad/plan` (aviso veterinario, año sanitario, ítems), `/sanidad` (tareas del plan: registrar, reprogramar, omitir)

| Pieza | Endpoint | Estado |
|---|---|---|
| Plan con su aviso «Validá este plan con tu veterinario» y quién lo aceptó | `GET …/plan-sanitario` | 🔌 API real |
| Plantillas (aftosa 2 campañas, rabia, tuberculina, parasitario bubalino NEA…) con condición por zona | `GET /catalogos` (`plantillas_sanitarias`) + `POST …/plan-sanitario/plantillas` (`aviso_aceptado: true`) | 🔌 probado en el campo de prueba |
| Editar ítem (nombre, cuándo, producto, activo) / ítem propio / sacar con motivo | `PATCH/POST …/plan-sanitario/items`, `POST …/items/{id}/archivar` | 🔌 probado (aftosa 1.ª campaña 01/03–30/04) |
| Tareas abiertas (vencidas + próximos 60 días) con registrar / reprogramar / omitir | `GET …/tareas?estado=abiertas`, `PATCH …/tareas/{id}`, `POST …/omitir` | 🔌 |

**Comentario del dev:** El aviso veterinario no es letra chica: es una franja fija arriba del plan y un tilde obligatorio para armarlo
(la API lo exige igual). Las plantillas se muestran en castellano de campo («Entre el 1 de marzo y el 30 de abril · todos los años»,
«Sólo si: zona endémica de rabia») y vienen preelegidas según las especies del campo. El «Año sanitario» dibuja ventanas y fechas
fijas en una grilla de 12 meses con la línea de hoy; lo que no aplica a la zona queda en beige. Las campañas de aftosa no traen
fechas porque cambian por provincia: el plan lo dice y pide cargarlas. Las tareas se registran con un clic y se cierran solas.

## TPA-34 · Pruebas diagnósticas y laboratorio · ✅ (web)

**Rutas:** `/sanidad/tuberculina` (lectura en la manga), `/sanidad/registrar?tipo=sanidad.prueba_diagnostica|sanidad.analisis_laboratorio`; atajos en `/sanidad`.

| Pieza | Endpoint | Estado |
|---|---|---|
| Tuberculina anocaudal / cervical simple: mm a 0 h y 72 h → negativo/sospechoso/positivo con umbrales versionados del catálogo | `GET /catalogos` (`tipos_prueba`) + `POST …/eventos` `sanidad.prueba_diagnostica` (`resultado_origen: calculado`, `umbrales_version`) | 🔌 probado: 0101 negativo (1,5 mm), 0102 positivo (6 mm) |
| Positivo → reactor (privado), con confirmación explícita antes de guardar | API marca reactor; `GET …/sanidad/reactores` | 🔌 probado |
| Pruebas con resultado declarado (brucelosis BPA/FPA, cervical comparada) | `sanidad.prueba_diagnostica` (`resultado_origen: declarado`) | 🔌 |
| Análisis (coprológico, frotis, IFD, MAT, serología) con informe adjunto | `POST /archivos/subidas` → PUT prefirmado → `…/completar` + `POST …/documentos` (`analisis_laboratorio`, vínculo al lote/animal) + `payload.documento_ids` | 🔌 probado: PDF subido, documento con huella y vínculo al lote |

**Comentario del dev:** La lectura de tuberculina copia el ritmo de la manga (caravana ↵, 0 h ↵, 72 h ↵) y muestra la diferencia y
el resultado en vivo con los umbrales del catálogo (datos versionados, no constantes), avisando que todavía no están validados por un
veterinario (duda 16 de Claude Design). Un positivo pinta la fila y no deja guardar sin tildar «Confirmo los positivos: pasan a
reactores»; ese tilde es la confirmación que pide la API. El servidor recalcula el resultado: el navegador sólo muestra. Los informes
se suben server-side a la URL prefirmada (el navegador nunca ve token ni URL) y quedan en Documentos con su huella (`lib/archivos.ts`).

## TPA-35 · Retiro vigente y reactores · ✅ (web)

**Dónde:** `/sanidad` (listas destacadas «Con retiro vigente» y «Reactores»), `/comercializacion/ofertas/nueva` (badges por lote), `/hacienda/eventos/nuevo?tipo=hacienda.egreso|hacienda.faena` (aviso antes de vender o faenar).

| Pieza | Endpoint | Estado |
|---|---|---|
| Animales y lotes anónimos con retiro vigente (hasta cuándo) | `GET …/sanidad/retiros` (`data` + `lotes`) | 🔌 API real (probado: lote «Bucerros 2026» hasta 20/11/2026) |
| Reactores, privados | `GET …/sanidad/reactores` | 🔌 (probado: 0102, tuberculina positiva) |
| Aviso al vender/faenar animales o un lote con retiro, o reactores | flags `retiro_vigente`/`reactor` de `AnimalResumen` + retiros por lote; la API además pide confirmar | 🔌 |
| Aviso al ofertar | badges en el selector de lotes + `GET …/ofertas/{id}/avisos` (retiro y reactores) | 🔌 |

**Comentario del dev:** Lo que no se puede vender sin pensarlo queda arriba de todo en Sanidad: dos listas con borde de color, una
amarilla (retiro, con la fecha hasta la que corre) y una roja con candado (reactores, «dato privado»). Al registrar una venta o
una faena aparece el aviso antes de cargar los datos, sin bloquear (la venta para invernada es válida), y la API vuelve a pedir
confirmación. El selector de lotes para ofertar dejó de usar una fecha fija y datos de ejemplo: muestra retiro y reactores reales
por lote. El reactor nunca llega a lo público (lo filtra la API; la web no lo pinta fuera del panel).

## TPA-36 · Carpeta documental con versiones y vencimientos · ✅ (web)

**Rutas:** `/documentos?vista=por_vencer|vencidos|perfil|revocados&privacidad=&q=` (carpeta + franja de vencimientos), `/documentos/nuevo?animal=&lote=` (subir), `/documentos/[id]` (archivo vigente, historia, integridad, visibilidad), `/documentos/archivo/[sha256]` (abre el archivo con URL prefirmada, server-side). La ficha del animal (pestaña Documentos) y el detalle de un evento con informe enlazan acá.

| Pieza | Endpoint | Estado |
|---|---|---|
| Carpeta con filtros (vista, categoría de privacidad, búsqueda), cursor | `GET …/documentos?estado=&vence_antes=&visibilidad=&privacidad=&q=` | 🔌 API real |
| Vencidos y por vencer (alertas 30/7/0 días) | `GET …/documentos/vencimientos?dias=30` | 🔌 |
| Alta: archivo (PDF/foto ≤ 10 MB) → tipo (privacidad por tipo; fiscal sólo con `documentos.fiscal`) → emisor, emisión, vencimiento propuesto → vínculos animal/lote/potrero | `/archivos/subidas` + PUT prefirmado + `…/completar` + `POST …/documentos` | 🔌 probado (acta aftosa en PNG) |
| Versión nueva (otro archivo), corrección de datos, revocación — siempre con motivo; la anterior queda | `POST …/documentos/{id}/versiones` | 🔌 probado (v2 con PDF) |
| Privado / en el perfil (fiscal nunca) | `POST …/documentos/{id}/visibilidad` | 🔌 |
| Abrir archivo | `GET /archivos/{sha256}` → 302 | 🔌 (la ficha trae `archivos[].url` con host interno `minio:9000`: pedido para la API) |

**Comentario del dev:** La carpeta arranca por lo que vence: una franja amarilla con vencidos y por vencer, con la salida dicha en
castellano («pedí la nueva constancia y subila como versión nueva»), sin prometer trámites con SENASA. Subir es una sola pantalla:
archivo, tipo (que fija la categoría de privacidad: un fiscal es fiscal siempre), datos y a qué corresponde, con resumen a la derecha.
La ficha muestra la foto del documento o un acceso al PDF, y la historia como línea de tiempo: cada versión con motivo, autor, rol y
huella con enlace a la verificación. Los archivos viajan server-side a la URL prefirmada; el navegador sólo recibe un redirect de 5 min.

## TPA-38 · Compartir documento por enlace temporal · ✅ (web)

**Rutas:** ficha `/documentos/[id]` → «Compartir por enlace»; pública `/[locale]/e/[token]` (la API arma `{web}/e/{token}`: `proxy.ts` redirige `/e/*` al idioma del navegador); `/api/enlaces/[token]/archivo/[sha]` abre el archivo revalidando el enlace.

| Pieza | Endpoint | Estado |
|---|---|---|
| Crear enlace (24 h, 7 días, 30 días o hasta una fecha; fijo a una versión o siempre la vigente), mostrado una sola vez + WhatsApp | `POST …/documentos/{id}/enlaces` (`aviso` si es fiscal) | 🔌 probado |
| Enlaces con estado, visitas y vencimiento; revocar | `GET …/enlaces`, `POST …/enlaces/{e}/revocar` | 🔌 |
| Página pública (es/en/pt): datos, nivel de confianza, versión, estado (vigente/vencido/reemplazado), verificación; 410 → «ya no está disponible»; no indexable | `GET /public/enlaces/{token}` | 🔌 probado |
| Abrir el archivo desde el enlace | `archivos[].url` del enlace | ⚠ la API devuelve la URL prefirmada con host interno `minio:9000` (no abre en dev); pedido para la API |

**Comentario del dev:** Compartir no es publicar: el enlace vive en la ficha del documento, dura lo que el productor elige y se
puede revocar, con el contador de visitas a la vista. El token se muestra una sola vez (la API no lo guarda) con copiar y WhatsApp,
y si el documento es fiscal se avisa antes. El comprador ve una página sobria en su idioma con el nivel de confianza, la versión y el
botón de verificación, más la aclaración de qué prueba la integridad. Si el enlace venció o lo revocaron lo dice sin rodeos.

## TPA-51 · Organizaciones y adhesión con consentimiento · 🟦

**Rutas:** `/organizaciones` (organizaciones disponibles, mis adhesiones, consentimientos y revocación); Configuración → Organizaciones.

| Pieza | Endpoint | Estado |
|---|---|---|
| Organizaciones disponibles | `GET /organizaciones` | 🔌 API real |
| Mis organizaciones | `GET /productores/{productor}/adhesiones` | 🔌 API real |
| Adhesión con alcances granulares, nueva versión y huella | `POST …/adhesiones`, `POST …/{adhesion}/consentimiento` | 🔌 API real |
| Revocación con motivo | `POST …/{adhesion}/revocar` | 🔌 API real |
| Alta de organización y administración de integrantes | `POST /organizaciones` (solo staff, no expuesto como operación en el OpenAPI), `POST …/miembros` (cuerpo no documentado) | No implementado: contrato incompleto y alta restringida a staff |

**Comentario del dev:** La pantalla permite encontrar organizaciones disponibles y adherirse eligiendo de forma explícita qué datos agregados se comparten. Desde cada adhesión activa se puede registrar otra versión del consentimiento o revocarla con motivo; se muestran versión, huella y cantidad de cambios del historial cuando la API los devuelve. El detalle aclara que la adhesión no publica datos en el directorio. No se usan datos de ejemplo. El OpenAPI vigente reserva la creación de organizaciones a staff y omite el cuerpo de la operación para administrar integrantes, por lo que esas acciones quedan pendientes del contrato administrativo.

## TPA-58 · «Busco» y perfil de profesional · 🟦

**Rutas:** `/comprador/buscos` (publicar, editar y cerrar demandas), `/comercializacion/demandas` (coincidencias del establecimiento), `/profesional` (editar perfil), `/[locale]/profesionales/[slug]` (perfil público ES/EN/PT).

| Pieza | Endpoint | Estado |
|---|---|---|
| Gestionar «Busco» (especie, categoría, cantidad, zona, plazo, peso y mensaje) | `GET/POST /comprador/buscos`, `PATCH/POST …/{busco}` | 🔌 API real |
| Coincidencias y respuestas del productor | `GET /establecimientos/{e}/demandas`, `POST …/{busco}/respuestas` | 🔌 API real |
| Perfil profesional y publicación | `GET/PUT /me/profesional`, `GET /public/profesionales/{slug}` | 🔌 API real |

**Comentario del dev:** El comprador carga especie, categorías, cantidad, zona o cualquier zona, plazo, peso objetivo y mensaje; puede decidir si muestra su nombre, editar o cerrar. La API mantiene el control de perfil comprador y verificación de email requeridos para publicar. Comercialización muestra el puntaje y los datos de cada coincidencia, con respuesta directa desde el establecimiento. El profesional declara matrícula, especialidades, provincias e idiomas, y decide si publica su perfil; la ficha pública está disponible en ES/EN/PT y aclara que esos datos son declarados. No se usan datos de ejemplo.

## TPA-57 · Cuenta de comprador y toma de tokens · 🟦

**Rutas:** `/comprador/cuenta` (cuenta liviana), `/comprador` (mis contratos, tomas y pagos informados), `/comprador/seguimientos`, `/[locale]/contratos/[codigo]` (tomar tokens y seguir productor).

| Pieza | Endpoint | Estado |
|---|---|---|
| Perfil comprador y verificación de email | `GET/PUT /me/comprador`, `GET /auth/me` | 🔌 API real |
| Reserva de tokens y anticipo a pagar | `POST /contratos/{codigo}/tomas` (`Idempotency-Key`) | 🔌 API real |
| Mis tomas, entregas y vencimiento | `GET /comprador/tomas` | 🔌 API real; incluye `contrato.fecha_entrega` |
| Informar pago del anticipo | `POST /comprador/tomas/{toma}/pago-informado` | 🔌 API real |
| Seguir/dejar de seguir productores | `GET/POST /seguimientos`, `DELETE /seguimientos/{establecimiento_slug}` | 🔌 API real |

**Comentario del dev:** La cuenta usa empresa, país y tipo de comprador; la API decide si el email está verificado. En el contrato el comprador calcula kg y anticipo por cantidad, y la reserva se envía con clave de idempotencia para no duplicar. «Mis contratos» muestra fecha de entrega, estado, anticipo y vencimiento devueltos por la API; el pago se informa como una transferencia externa y el productor confirma la recepción. Los seguimientos se gestionan desde perfiles/contratos y la API activa avisos por nuevas ofertas y contratos. Se retiraron fallbacks de muestra para todos estos endpoints.

## TPA-3 · Estructura inicial de tropilla-next · ✅ (bugfix)

**Alcance:** verificación TypeScript desde clon limpio; `package.json`, `.github/workflows/ci.yml`, `README.md` y `AGENTS.md`.

| Pieza | Comando | Estado |
|---|---|---|
| Generación de tipos de rutas y verificación TS | `npm run typecheck` (`next typegen && tsc --noEmit`) | 🔌 sin datos de API |
| CI y DoD documentado | workflow, README y AGENTS | Actualizados |

**Comentario del dev:** En un checkout limpio `tsc` no encuentra los helpers globales de rutas hasta generar `.next/types`. El nuevo script `typecheck` hace esa generación y corre TypeScript en el mismo paso. CI, README y AGENTS usan ahora el mismo comando, para que local y GitHub ejecuten la misma secuencia. No agrega datos de ejemplo ni toca endpoints de producto.

## TPA-21 · Carga inicial de stock por planilla · ✅ (bugfix)

**Rutas:** `/hacienda/importar` (subir), `/hacienda/importar/{id}` (revisar y corregir).

| Pieza | Endpoint | Estado |
|---|---|---|
| Valor exacto de cada celda original | `ImportacionFila.original` vía `GET …/importaciones/{id}/filas` | 🔌 API real; `null` en filas antiguas |
| Celda con error y editor precargado | `original[columna]`; corrección sigue por `PATCH …/filas/{numero}` | 🔌 API real |
| Lectura CSV en el navegador y persistencia de crudos | Eliminadas; la carga y el original se procesan en servidor/API | Sin mock ni localStorage |

**Comentario del dev:** La pantalla de revisión toma el texto original por columna directamente de cada fila de la API. Cuando una columna tiene error, la tabla muestra el valor sin normalizar y el editor lo precarga, incluso si es un valor que no existe en los catálogos. Los archivos CSV ya no se leen en el navegador y se eliminó el almacenamiento de filas crudas en `localStorage`. En importaciones anteriores cuyo `original` es `null`, las celdas en error muestran «Falta» y el editor queda vacío para completar.

## TPA-23 · Pesajes y ganancia diaria · ✅ (bugfix)

**Ruta:** `/hacienda/{id}` (ficha del animal, sección Resumen).

| Pieza | Endpoint | Estado |
|---|---|---|
| Serie de peso ordenada, GDP y fuente | `GET /establecimientos/{e}/animales/{a}/pesajes?incluir_lote=true` | 🔌 API real |
| Curva y tabla | Pesaje, nacimiento, destete y peso heredado del lote | 🔌 API real; marca por fuente |
| Lectura de `resumen` de eventos | Eliminada para construir la curva | Sin mock |

**Comentario del dev:** La ficha obtiene los puntos de peso del endpoint dedicado, que devuelve el peso, la fuente y la ganancia diaria calculada por la API. La curva y la tabla identifican por separado los pesos heredados del lote, los de nacimiento y los de destete. La tabla muestra la GDP informada por el endpoint y evita recalcularla con puntos que no son pesajes. No hay fallback ni datos de muestra para esta sección.

## TPA-25 · Recategorización sugerida · ✅ (bugfix)

**Ruta:** `/hacienda/recategorizacion`.

| Pieza | Endpoint/dato | Estado |
|---|---|---|
| Confirmar categorías sugeridas | `POST /establecimientos/{e}/animales/recategorizar` | 🔌 API real existente |
| Descartar sugerencias seleccionadas | `POST /establecimientos/{e}/animales/sugerencias/descartar` | 🔌 API real; individual y en bloque, con confirmación |
| Sugerencia vigente descartada | `Animal.categorias_descartadas` y proyección de la API | 🔌 Sin persistencia local ni mock |

**Comentario del dev:** Cada sugerencia se puede descartar por separado o junto con las seleccionadas, después de confirmar en un diálogo que explica qué va a pasar. Se envían el animal y la categoría sugerida vigente; si cambió desde que se abrió la pantalla, la API puede rechazar el conjunto sin aplicar una parte. Después del descarte, la lista se vuelve a cargar y la API deja de mostrar esa categoría para ese animal. La pantalla aclara que también se sugieren crías de más de 7 meses sin destete; no se usan datos de ejemplo.

### TPA-76 · Ficha completa del establecimiento · ✅

**Comentario del dev:** El panel usa formularios por dominio para sanidad/RENSPA, polígono (GeoJSON/KML), potreros y aguadas, suelos/pasturas/carga, infraestructura, personal, marcas y señales, clima, logística y certificaciones; cada bloque publica solo tras optar por visibilidad. La ficha pública `/es/p/{slug}` muestra los campos autorizados y omite datos sanitarios identificatorios. El perímetro se carga explícitamente y se valida en la API; no se infiere del punto de GPS. Verificado con typecheck, ESLint y build de producción Next.

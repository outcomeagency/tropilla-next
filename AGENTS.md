<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# tropilla-next

Web de TROPILLA: panel de gestión del productor (`app/(panel)`), ingreso (`app/(auth)`) y portal público multilingüe (`app/[locale]`, es/en/pt). Fuente de verdad funcional y visual: el brain (`../brain`), en especial `design/previews/`, `design/addendum-componentes-gex-pyae.md` y `visual-identity/visual-identity.md`.

## Antes de escribir código

- **Leé `node_modules/next/dist/docs/`** para lo que vayas a tocar. Next 16.4: el middleware es `proxy.ts`; `cacheComponents` y `partialPrefetching` están activos (leer cookies/headers/searchParams fuera de `<Suspense>` rompe el build; `dynamic`, `dynamicParams`, `revalidate` y `runtime` no existen como segment config).
- Hay **tres root layouts** (`(panel)`, `(auth)`, `[locale]`): navegar entre ellos es carga completa. El 404 global es `app/global-not-found.tsx`.

## Reglas

- Colores sólo como tokens en `app/theme.css` (`@theme`). Cero hex en componentes.
- Reutilizá `components/ui.tsx` e `components/icons.tsx` antes de crear primitivas. Estados siempre con ícono + texto; mapa de estados en `lib/status.ts`.
- Nada de «look IA»: sin gradientes, glass, sombras difusas ni emojis. Tarjetas blancas con borde de 1 px; sombra sólo en hover de lo clickeable.
- La API se llama **sólo server-side** con `lib/api.ts` (`TROPILLA_API_URL`); el token Sanctum vive en la cookie httpOnly `tropilla_token` (`lib/session.ts`). Verificá la sesión dentro de cada Server Action, no confíes sólo en `proxy.ts`.
- Rutas nuevas del panel: sumarlas a `lib/nav.ts` **y** al `matcher` de `proxy.ts`.
- `lib/mock.ts` son datos de ejemplo para maquetar: reemplazarlos por la API, nunca importarlos desde lo público.
- Lenguaje de confianza: sólo «Declarado» e «Integridad registrada». Nunca «certificado», «verificado oficialmente» ni «apto exportación». La leyenda del pie público es fija.
- Privado por defecto: CUIT, RENSPA, precios, fiscal, reactores y ubicación exacta nunca se muestran en lo público.

## Verificación (DoD)

`npx tsc --noEmit` · `npm run lint` · `npm run build`, los tres en verde.

## Git

Ramas `feature|bugfix/TPA-N` desde `integration`, merge `--no-ff`. Commits: `-m "feat: <título del ticket>" -m "<english description>" -m "refs: #TPA-N"`. Sin `Co-Authored-By`, firmas ni «Generated with».

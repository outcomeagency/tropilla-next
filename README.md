# tropilla-next

Web de TROPILLA: panel de gestión del productor ganadero y portal público (es/en/pt).
Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4.

## Desarrollo

```bash
cp .env.example .env.local   # TROPILLA_API_URL (default http://localhost:8090/api/v1)
npm install
npm run dev                  # http://localhost:3000
```

| Ruta | Qué es |
|---|---|
| `/` | Redirige al portal en el idioma del navegador (`/es`, `/en`, `/pt`) |
| `/es`, `/en`, `/pt` | Home del portal público |
| `/ingresar` | Login contra `POST /auth/login` (token Sanctum en cookie httpOnly) |
| `/inicio` … `/configuracion` | Panel (protegido por `proxy.ts`) |

Sin la API levantada, el login avisa que no hay conexión. Para ver el panel igual, creá a mano la cookie
`tropilla_token` con cualquier valor: la sidebar muestra «Sin conexión» y las pantallas usan `lib/mock.ts`.

## Estructura

```
app/theme.css            tokens de marca (@theme)      components/ui.tsx     primitivas
app/(panel)/             panel + sidebar               components/icons.tsx  íconos lineales
app/(auth)/              /ingresar, /salir             lib/api.ts            cliente API server-side
app/[locale]/            portal público es/en/pt       lib/session.ts        cookie httpOnly
proxy.ts                 protección del panel + idioma lib/mock.ts           datos de ejemplo (reemplazar)
```

Antes de tocar código leé `AGENTS.md`.

## Verificación

```bash
npm run typecheck && npm run lint && npm run build
```

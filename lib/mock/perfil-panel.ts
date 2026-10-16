import "server-only";
/**
 * ⚠ DATOS DE EJEMPLO ⚠ — configuración del perfil público (GET/PATCH /establecimientos/{e}/perfil…, TPA-50)
 * en memoria del servidor mientras la API no tenga el módulo.
 */
import type { S } from "@/lib/schemas";

type Perfil = S<"Perfil">;
const store = new Map<string, Perfil>();

export const SECCIONES = ["portada", "actividad", "rodeo", "sanidad", "trazabilidad", "documentos", "ofertas", "contacto"] as const;
export type Seccion = (typeof SECCIONES)[number];
export const DERIVADAS: Seccion[] = ["rodeo", "sanidad", "trazabilidad"];

function seed(est: string, nombre: string): Perfil {
  const slug = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return {
    establecimiento_id: est,
    slug,
    url_publica: `/es/p/${slug}`,
    publicado: false,
    en_directorio: true,
    indexable: true,
    preview_aceptada_en: null,
    primera_publicacion_en: null,
    secciones: Object.fromEntries(SECCIONES.map((s) => [s, { activa: s !== "documentos", congelada_en: null }])),
    textos: {
      historia:
        "Establecimiento de cría, recría e invernada de bovinos y bubalinos en un sistema pastoril sobre humedales. Trabajamos con registro individual y plan sanitario con nuestro veterinario.",
    },
    idiomas: ["es", "en", "pt"],
    contacto_visible: { formulario: true, whatsapp: false, email: false, telefono: false },
    ubicacion_publica: "departamento",
    asociaciones_visibles: true,
    completitud: 72,
    faltantes: ["Subí al menos 3 fotos del campo", "Publicá un documento sanitario vigente", "Cargá las razas de cada especie"],
    row_version: 1,
  };
}

export function mockPerfil(est: string, nombre: string): Perfil {
  if (!store.has(est)) store.set(est, seed(est, nombre));
  return store.get(est)!;
}

export function mockGuardarPerfil(est: string, nombre: string, patch: Partial<Perfil>): Perfil {
  const next = { ...mockPerfil(est, nombre), ...patch };
  next.row_version = (next.row_version ?? 0) + 1;
  store.set(est, next);
  return next;
}

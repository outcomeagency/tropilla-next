/**
 * ⚠ DATOS DE EJEMPLO ⚠ — sesión demo mientras la API no tenga /auth (TPA-9).
 * Sólo se usa a través de lib/mock/fallback.ts. Reemplazado por GET /auth/me.
 */
import type { S } from "@/lib/schemas";

export const MOCK_TOKEN_PREFIX = "mock-";
export const DEMO_EMAIL = "demo@tropilla.ar";
export const DEMO_PASSWORD = "tropilla-demo";

const ABILITIES_DUENO = [
  "establecimiento.ver",
  "establecimiento.editar",
  "establecimiento.ver_privados",
  "hacienda.ver",
  "hacienda.crear",
  "hacienda.corregir",
  "sanidad.ver",
  "reproduccion.ver",
  "documentos.ver",
  "documentos.fiscal",
  "comercial.precios",
  "ofertas.ver",
  "ofertas.gestionar",
  "ofertas.publicar",
  "consultas.ver",
  "consultas.gestionar",
  "perfil.ver_preview",
  "perfil.editar",
  "perfil.publicar",
  "usuarios.ver",
  "usuarios.gestionar",
  "contratos.ver",
  "contratos.gestionar",
];

const ABILITIES_ASESOR = ["establecimiento.ver", "hacienda.ver", "hacienda.crear", "sanidad.ver", "reproduccion.ver", "documentos.ver"];

export function mockMe(nombre = "Ramón Ferreyra", email = DEMO_EMAIL, sinCampo = false): S<"Me"> {
  return {
    usuario: {
      id: "01920000-0000-7000-8000-000000000001",
      nombre,
      email,
      telefono: null,
      idioma: "es",
      pais: "AR",
      email_verificado: !sinCampo,
    },
    membresias: sinCampo
      ? []
      : [
          {
            id: "01920000-0000-7000-8000-0000000000a1",
            establecimiento_id: "01920000-0000-7000-8000-000000000e01",
            establecimiento_nombre: "La Esperanza",
            productor_nombre: "Agropecuaria Don Ramón S.A.",
            rol: "dueno",
            abilities: ABILITIES_DUENO,
          },
          {
            id: "01920000-0000-7000-8000-0000000000a2",
            establecimiento_id: "01920000-0000-7000-8000-000000000e02",
            establecimiento_nombre: "El Ombú",
            productor_nombre: "Familia Ferreyra",
            rol: "dueno",
            abilities: ABILITIES_DUENO,
          },
          {
            id: "01920000-0000-7000-8000-0000000000a3",
            establecimiento_id: "01920000-0000-7000-8000-000000000e03",
            establecimiento_nombre: "San Isidro",
            productor_nombre: "Ganadera Itatí S.R.L.",
            rol: "asesor",
            abilities: ABILITIES_ASESOR,
          },
        ],
    comprador: null,
    profesional: null,
  };
}

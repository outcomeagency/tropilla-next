/**
 * Navegación del panel (sidebar verde monte, preview 01).
 * Si se agrega una ruta, sumarla también al `matcher` de proxy.ts.
 */
export type NavIcon =
  | "home"
  | "cow"
  | "heart"
  | "shield"
  | "map"
  | "file"
  | "route"
  | "chart"
  | "user"
  | "settings";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}

export const PANEL_NAV: NavItem[] = [
  { href: "/inicio", label: "Inicio", icon: "home" },
  { href: "/hacienda", label: "Hacienda", icon: "cow" },
  { href: "/reproduccion", label: "Reproducción", icon: "heart" },
  { href: "/sanidad", label: "Sanidad", icon: "shield" },
  { href: "/establecimiento", label: "Mi establecimiento", icon: "map" },
  { href: "/documentos", label: "Documentos", icon: "file" },
  { href: "/trazabilidad", label: "Trazabilidad", icon: "route" },
  { href: "/comercializacion", label: "Comercialización", icon: "chart" },
  { href: "/perfil-publico", label: "Perfil público", icon: "user" },
];

export const PANEL_NAV_FOOTER: NavItem[] = [{ href: "/configuracion", label: "Configuración", icon: "settings" }];

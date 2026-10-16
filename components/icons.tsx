import type { ReactNode, SVGProps } from "react";

/**
 * Iconografía lineal de TROPILLA: 24×24, trazo 1.75, puntas redondeadas,
 * `currentColor`. Mismo grosor en todo el producto (visual-identity §5).
 */
export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ── Navegación ── */
export const IconHome = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 10.5 12 3.8l8.5 6.7" />
    <path d="M5.5 9v10.2a.8.8 0 0 0 .8.8H10v-5.5h4V20h3.7a.8.8 0 0 0 .8-.8V9" />
  </Icon>
);

/** Vacuno de perfil (hacienda / bovino). */
export const IconCow = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.5 4.5c0 2 1.2 3.2 2.8 3.5M17.5 4.5c0 2-1.2 3.2-2.8 3.5" />
    <path d="M8.6 8.3 4 9.2c.7 1.6 2.3 2.3 4.4 1.9M15.4 8.3l4.6.9c-.7 1.6-2.3 2.3-4.4 1.9" />
    <path d="M8.4 8h7.2l-.5 6.6H8.9L8.4 8Z" />
    <rect x="8" y="14.5" width="8" height="5.5" rx="2.75" />
    <path d="M10.5 17.3h.01M13.5 17.3h.01" />
  </Icon>
);

/** Búfalo de perfil: cuernos curvos hacia atrás, cuerpo más pesado. */
export const IconBuffalo = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8.2 8.6C4.6 9.4 2.2 7.8 2.6 4.8c1 1.6 2.9 2.1 5.9 1.8M15.8 8.6c3.6.8 6-.8 5.6-3.8-1 1.6-2.9 2.1-5.9 1.8" />
    <path d="M7.8 7.6h8.4l-.6 7H8.4l-.6-7Z" />
    <rect x="7.6" y="14.5" width="8.8" height="5.5" rx="2.75" />
    <path d="M10.4 17.3h.01M13.6 17.3h.01" />
  </Icon>
);

export const IconHeart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 19.5s-7.5-4.3-7.5-9.6A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.3c0 5.3-7.5 9.6-7.5 9.6Z" />
  </Icon>
);

export const IconShield = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 5 6v5.6c0 4.3 3 7.6 7 8.9 4-1.3 7-4.6 7-8.9V6l-7-2.5Z" />
    <path d="M12 9v5M9.5 11.5h5" />
  </Icon>
);

export const IconMap = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 4.5-5 2v13l5-2 6 2 5-2v-13l-5 2-6-2Z" />
    <path d="M9 4.5v13M15 6.5v13" />
  </Icon>
);

export const IconFile = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 3.5H7.3c-.7 0-1.3.6-1.3 1.3v14.4c0 .7.6 1.3 1.3 1.3h9.4c.7 0 1.3-.6 1.3-1.3V7.5l-4-4Z" />
    <path d="M14 3.5v4h4M9 12.5h6M9 16h4" />
  </Icon>
);

/** Trazabilidad: puntos conectados (líneas de trazabilidad de la marca). */
export const IconRoute = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="5.5" cy="18" r="2" />
    <circle cx="18.5" cy="6" r="2" />
    <path d="M7.5 18h7a3 3 0 0 0 0-6h-5a3 3 0 0 1 0-6h7" />
  </Icon>
);

export const IconChart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h16" />
    <path d="M6.5 16.5v-4M11 16.5V7.5M15.5 16.5v-6M20 16.5v-10" />
  </Icon>
);

export const IconUser = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c.9-3.6 3.9-5.6 7.5-5.6s6.6 2 7.5 5.6" />
  </Icon>
);

export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13.6a7.6 7.6 0 0 0 0-3.2l2-1.5-2-3.4-2.3 1a7.4 7.4 0 0 0-2.8-1.6L14 2.5h-4l-.3 2.4a7.4 7.4 0 0 0-2.8 1.6l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3.2l-2 1.5 2 3.4 2.3-1a7.4 7.4 0 0 0 2.8 1.6l.3 2.4h4l.3-2.4a7.4 7.4 0 0 0 2.8-1.6l2.3 1 2-3.4-2-1.5Z" />
  </Icon>
);

/* ── Acciones ── */
export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Icon>
);

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Icon>
);

export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const IconArrowUp = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Icon>
);

export const IconArrowDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Icon>
);

export const IconMenu = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const IconLogout = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4.5h4.2c.7 0 1.3.6 1.3 1.3v12.4c0 .7-.6 1.3-1.3 1.3H14" />
    <path d="M10 8l-4 4 4 4M6 12h9" />
  </Icon>
);

export const IconDownload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
  </Icon>
);

/* ── Dominio ── */
export const IconBuilding = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 20.5h17M5 20.5V10l7-5.5 7 5.5v10.5" />
    <path d="M10 20.5v-5h4v5" />
  </Icon>
);

export const IconSyringe = (p: IconProps) => (
  <Icon {...p}>
    <path d="m16 3.5 4.5 4.5M18.25 5.75 15 9" />
    <path d="M13.5 6.5 17.5 10.5 9 19H5v-4l8.5-8.5Z" />
    <path d="M10.5 9.5 12 11M8.5 11.5 10 13M5 19l-1.5 1.5" />
  </Icon>
);

export const IconCalendar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="1.8" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    <path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 16.8h.01M12 16.8h.01" />
  </Icon>
);

export const IconMessage = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.5 5h13c.8 0 1.5.7 1.5 1.5v8.5c0 .8-.7 1.5-1.5 1.5H10l-4.5 3.5v-3.5h0c-.8 0-1.5-.7-1.5-1.5V6.5C4 5.7 4.7 5 5.5 5Z" />
  </Icon>
);

export const IconList = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6.5h11M9 12h11M9 17.5h11" />
    <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
  </Icon>
);

export const IconPin = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </Icon>
);

export const IconGlobe = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5s1.1-6.1 3.4-8.5Z" />
  </Icon>
);

export const IconLock = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="1.8" />
    <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
  </Icon>
);

export const IconScale = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v16M6 20h12M5 8h14" />
    <path d="M5 8 2.5 14a2.5 2.5 0 0 0 5 0L5 8ZM19 8l-2.5 6a2.5 2.5 0 0 0 5 0L19 8Z" />
  </Icon>
);

/* ── Estados (siempre acompañan texto, nunca solos) ── */
/** Integridad registrada: escudo con tilde. */
export const IconShieldCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 5 6v5.6c0 4.3 3 7.6 7 8.9 4-1.3 7-4.6 7-8.9V6l-7-2.5Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Icon>
);

/** Declarado: lo cargó el productor (persona + documento). */
export const IconDeclared = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5.5 19.5c.8-3.3 3.4-5.2 6.5-5.2s5.7 1.9 6.5 5.2" />
  </Icon>
);

export const IconCheckCircle = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.2 2.3 2.3 4.7-4.8" />
  </Icon>
);

export const IconAlert = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.8v5M12 16.2h.01" />
  </Icon>
);

export const IconInfo = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 7.8h.01" />
  </Icon>
);

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const IconSparkle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.6 6.6l2.2 2.2M15.2 15.2l2.2 2.2M6.6 17.4l2.2-2.2M15.2 8.8l2.2-2.2" />
  </Icon>
);

/** Guardado en el teléfono (sync local). */
export const IconPhone = (p: IconProps) => (
  <Icon {...p}>
    <rect x="7" y="3" width="10" height="18" rx="2" />
    <path d="M11 17.5h2" />
  </Icon>
);

/** Anclado: ancla de integridad. */
export const IconAnchor = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="5.5" r="2" />
    <path d="M12 7.5v13M8 11h8M4.5 13.5a7.5 7.5 0 0 0 15 0" />
  </Icon>
);

export const IconCloudOff = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3l18 18" />
    <path d="M8.5 7.6A5.5 5.5 0 0 1 17 11.5h.5a3.5 3.5 0 0 1 2.3 6.1M15.5 18.5H7a4 4 0 0 1-1.7-7.6" />
  </Icon>
);

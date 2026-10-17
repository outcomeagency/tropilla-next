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

/** Nube con lluvia (clima y alertas climáticas). */
export const IconCloud = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 16.5a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 9.5h.5a3.5 3.5 0 0 1 .5 6.97" />
    <path d="M9 19l-.8 1.5M13 19l-.8 1.5M17 19l-.8 1.5" />
  </Icon>
);

export const IconCloudOff = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3l18 18" />
    <path d="M8.5 7.6A5.5 5.5 0 0 1 17 11.5h.5a3.5 3.5 0 0 1 2.3 6.1M15.5 18.5H7a4 4 0 0 1-1.7-7.6" />
  </Icon>
);

/* ── Cuenta, formularios y acciones ── */
export const IconEye = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.8 12s3.3-6.2 9.2-6.2 9.2 6.2 9.2 6.2-3.3 6.2-9.2 6.2S2.8 12 2.8 12Z" />
    <circle cx="12" cy="12" r="2.7" />
  </Icon>
);

export const IconEyeOff = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 4l16 16" />
    <path d="M9.9 6.1A9.6 9.6 0 0 1 12 5.8c5.9 0 9.2 6.2 9.2 6.2a15.6 15.6 0 0 1-2.6 3.3M6.4 7.6A15 15 0 0 0 2.8 12s3.3 6.2 9.2 6.2a9.3 9.3 0 0 0 4.3-1" />
    <path d="M10.1 10.2a2.7 2.7 0 0 0 3.7 3.7" />
  </Icon>
);

export const IconMail = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.2" y="5.5" width="17.6" height="13" rx="1.8" />
    <path d="m4 7 8 6 8-6" />
  </Icon>
);

export const IconKey = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="15" r="4" />
    <path d="m10.9 12.1 8.6-8.6M16.5 6.5l2.3 2.3M14.3 8.7l1.8 1.8" />
  </Icon>
);

export const IconArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const IconWhatsapp = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.2 19.8l1.1-3.9A8.3 8.3 0 1 1 8.4 19l-4.2.8Z" />
    <path d="M9.2 8.6c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .5-.1.6l-.5.6c.6 1.1 1.5 2 2.7 2.6l.6-.6c.2-.2.4-.2.6-.1l1.5.7c.2.1.3.3.3.5v.5c0 .4-.2.8-.6 1-.6.3-1.5.4-2.6-.1a8.6 8.6 0 0 1-4.1-4.1c-.4-1-.4-1.9-.2-2.5Z" />
  </Icon>
);

/** Robot de Android (marca de Google; trazado de Simple Icons, CC0). Relleno, no lineal: es un logo. */
export const IconAndroid = ({ size = 20, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18.4395 5.5586c-.675 1.1664-1.352 2.3318-2.0274 3.498-.0366-.0155-.0742-.0286-.1113-.043-1.8249-.6957-3.484-.8-4.42-.787-1.8551.0185-3.3544.4643-4.2597.8203-.084-.1494-1.7526-3.021-2.0215-3.4864a1.1451 1.1451 0 0 0-.1406-.1914c-.3312-.364-.9054-.4859-1.379-.203-.475.282-.7136.9361-.3886 1.5019 1.9466 3.3696-.0966-.2158 1.9473 3.3593.0172.031-.4946.2642-1.3926 1.0177C2.8987 12.176.452 14.772 0 18.9902h24c-.119-1.1108-.3686-2.099-.7461-3.0683-.7438-1.9118-1.8435-3.2928-2.7402-4.1836a12.1048 12.1048 0 0 0-2.1309-1.6875c.6594-1.122 1.312-2.2559 1.9649-3.3848.2077-.3615.1886-.7956-.0079-1.1191a1.1001 1.1001 0 0 0-.8515-.5332c-.5225-.0536-.9392.3128-1.0488.5449zm-.0391 8.461c.3944.5926.324 1.3306-.1563 1.6503-.4799.3197-1.188.0985-1.582-.4941-.3944-.5927-.324-1.3307.1563-1.6504.4727-.315 1.1812-.1086 1.582.4941zM7.207 13.5273c.4803.3197.5506 1.0577.1563 1.6504-.394.5926-1.1038.8138-1.584.4941-.48-.3197-.5503-1.0577-.1563-1.6504.4008-.6021 1.1087-.8106 1.584-.4941z" />
  </svg>
);

export const IconQr = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <path d="M14 14h2.5v2.5H14zM18.5 14H20M14 19.5V20M17 18.5h3V20" />
  </Icon>
);

export const IconUpload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 15.5V4M7.5 8.5 12 4l4.5 4.5" />
    <path d="M4.5 14.5v3.7c0 .7.6 1.3 1.3 1.3h12.4c.7 0 1.3-.6 1.3-1.3v-3.7" />
  </Icon>
);

export const IconFilter = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Icon>
);

export const IconUsers = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19.5c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" />
    <path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.3 14.9c1.6.6 2.8 2.2 3.2 4.6" />
  </Icon>
);

export const IconCopy = (p: IconProps) => (
  <Icon {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="1.8" />
    <path d="M15.5 8.5V6.3c0-1-.8-1.8-1.8-1.8H6.3c-1 0-1.8.8-1.8 1.8v7.4c0 1 .8 1.8 1.8 1.8h2.2" />
  </Icon>
);

export const IconExternal = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13.5 4.5h6v6M19.5 4.5l-8 8" />
    <path d="M17.5 13.5v4.7c0 .7-.6 1.3-1.3 1.3H5.8c-.7 0-1.3-.6-1.3-1.3V7.8c0-.7.6-1.3 1.3-1.3h4.7" />
  </Icon>
);

export const IconShare = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="17.5" cy="6" r="2.5" />
    <circle cx="6.5" cy="12" r="2.5" />
    <circle cx="17.5" cy="18" r="2.5" />
    <path d="m8.7 10.8 6.6-3.6M8.7 13.2l6.6 3.6" />
  </Icon>
);

export const IconLeaf = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 19c0-8 5-13.5 14.5-14-.3 9.3-5.7 14.5-13.5 14.5" />
    <path d="M5 19c2.5-4 5.5-6.6 9-8.5" />
  </Icon>
);

/** Alambrado: postes e hilos (campos y pastajes). */
export const IconFence = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 20V6l1.5-2L8 6v14M16 20V6l1.5-2L19 6v14" />
    <path d="M3 9.5h18M3 15h18" />
  </Icon>
);

export const IconHash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.5 4 8 20M16 4l-1.5 16M4.5 9h15.5M4 15h15.5" />
  </Icon>
);

export const IconCamera = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 8.3c0-.7.6-1.3 1.3-1.3h2.4l1.5-2h4.6l1.5 2h2.4c.7 0 1.3.6 1.3 1.3v9.4c0 .7-.6 1.3-1.3 1.3H5.8c-.7 0-1.3-.6-1.3-1.3Z" />
    <circle cx="12" cy="12.8" r="3.3" />
  </Icon>
);

export const IconTag = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.8 12.3V4.8c0-.6.4-1 1-1h7.5l8 8a1.4 1.4 0 0 1 0 2l-5.5 5.5a1.4 1.4 0 0 1-2 0Z" />
    <circle cx="8.3" cy="8.3" r="1.4" />
  </Icon>
);

export const IconSend = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4Z" />
  </Icon>
);

export const IconTruck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 6.5h11v9.5H3zM14 9.5h3.8l3.2 3.5v3H14" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17.5" cy="17.5" r="1.8" />
  </Icon>
);

export const IconStar = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 4 2.5 5.1 5.6.8-4 3.9.9 5.6L12 16.8l-5 2.6.9-5.6-4-3.9 5.6-.8Z" />
  </Icon>
);

export const IconRuler = (p: IconProps) => (
  <Icon {...p}>
    <path d="m3.5 16.5 13-13 4 4-13 13Z" />
    <path d="m7.5 12.5 2 2M10.5 9.5l1.5 1.5M13.5 6.5l2 2" />
  </Icon>
);

export const IconLanguage = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h9M8.5 4v2M6 6c.6 3 2.8 5.5 6 7M11 6c-.7 3.2-3 6-6.5 7.8" />
    <path d="m12.5 20 3.5-8.5 3.5 8.5M13.7 17.2h4.6" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 7h15M9.5 7V5.2c0-.4.3-.7.7-.7h3.6c.4 0 .7.3.7.7V7M6.5 7l.8 11.6c.1.8.7 1.4 1.5 1.4h6.4c.8 0 1.4-.6 1.5-1.4L17.5 7M10 10.5v6M14 10.5v6" />
  </Icon>
);

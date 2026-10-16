import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  ComponentType,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { ESTADOS, TONE_CLASS, type Estado, type Tone } from "@/lib/status";
import type { Delta, Especie, EstadoSync, NivelConfianza } from "@/lib/types";
import {
  IconAlert,
  IconAnchor,
  IconArrowDown,
  IconArrowUp,
  IconBuffalo,
  IconCheckCircle,
  IconChevronDown,
  IconClock,
  IconCow,
  IconDeclared,
  IconInfo,
  IconPhone,
  IconSearch,
  IconShieldCheck,
  type IconProps,
} from "@/components/icons";

/**
 * Primitivas de UI de TROPILLA. Anatomía según brain/design/addendum-componentes-gex-pyae.md
 * y las previews aprobadas. Superficies planas, borde de 1 px, sin sombra por
 * defecto (sólo hover en lo clickeable), estados siempre con ícono + texto.
 */

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/* ───────────────────────── Card ───────────────────────── */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-[var(--radius-card)] border border-border bg-surface", className)}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[16px] font-semibold leading-6 text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("px-5 py-4", className)}>{children}</div>;
}

/* ───────────────────────── PageHeader ───────────────────────── */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ───────────────────────── Botones ───────────────────────── */

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-monte text-blanco hover:bg-monte-700",
  secondary: "bg-campo-50 text-monte hover:bg-surface-2",
  outline: "border border-border-strong bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface-2",
  danger: "border border-danger-border bg-surface text-danger hover:bg-danger-bg",
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-sm",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] font-medium transition-colors",
    "disabled:pointer-events-none disabled:opacity-55",
    BUTTON_VARIANT[variant],
    BUTTON_SIZE[size],
    className,
  );
}

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ícono a la izquierda del texto. */
  icon?: ReactNode;
  /** Si se pasa, renderiza un <Link>. */
  href?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant = "primary", size = "md", icon, href, className, children, type, ...rest }: ButtonProps) {
  const cls = buttonClass(variant, size, className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} className={cls} {...rest}>
      {icon}
      {children}
    </button>
  );
}

/* ───────────────────────── Badge de estado ───────────────────────── */

const ESTADO_ICON: Record<Estado, ComponentType<IconProps>> = {
  urgente: IconAlert,
  pendiente: IconClock,
  informativo: IconInfo,
  por_revisar: IconSearch,
  sugerencia: IconCheckCircle,
  vencido: IconAlert,
  retiro_vigente: IconClock,
  al_dia: IconCheckCircle,
};

/** Badge genérico: tono semántico + ícono + texto (nunca sólo color). */
export function Badge({ tone = "neutral", icon, children, wrap = false }: { tone?: Tone; icon?: ReactNode; children: ReactNode; wrap?: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] border px-2 py-0.5 text-[12px] font-semibold leading-5",
        wrap ? "max-w-full" : "whitespace-nowrap",
        TONE_CLASS[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Nivel de confianza compacto (líneas de tiempo densas): ícono + texto, sin caja. */
export function TrustInline({ nivel, label }: { nivel: NivelConfianza; label?: string }) {
  const { Icon } = TRUST[nivel];
  return (
    <span className={cx("inline-flex items-center gap-1 text-[12px] font-semibold", nivel === "integridad_registrada" ? "text-success" : "text-neutral")}>
      <Icon size={14} className="shrink-0" />
      {label ?? TRUST[nivel].label}
    </span>
  );
}

/** Badge de un estado del dominio, con tono e ícono del mapa central (lib/status.ts). */
export function StatusBadge({ estado }: { estado: Estado }) {
  const { label, tone } = ESTADOS[estado];
  const Icon = ESTADO_ICON[estado];
  return (
    <Badge tone={tone} icon={<Icon size={14} />}>
      {label}
    </Badge>
  );
}

/* ───────────────────────── Confianza ───────────────────────── */

const TRUST: Record<NivelConfianza, { label: string; tone: Tone; Icon: ComponentType<IconProps> }> = {
  declarado: { label: "Declarado", tone: "neutral", Icon: IconDeclared },
  integridad_registrada: { label: "Integridad registrada", tone: "success", Icon: IconShieldCheck },
};

/**
 * Nivel de confianza de un dato. Sólo los niveles permitidos del MVP:
 * nunca «certificado» ni «verificado». `detail` agrega contexto (ej. «Balanza 10/10/2026»);
 * `label` traduce el nivel en la web pública (mismo significado, otro idioma).
 */
export function TrustBadge({ nivel, detail, label: labelOverride }: { nivel: NivelConfianza; detail?: string; label?: string }) {
  const { tone, Icon } = TRUST[nivel];
  const label = labelOverride ?? TRUST[nivel].label;
  return (
    <Badge tone={tone} icon={<Icon size={14} className="shrink-0" />} wrap={!!detail}>
      {detail ? `${detail} · ${label}` : label}
    </Badge>
  );
}

/* ───────────────────────── Especie ───────────────────────── */

const ESPECIE: Record<Especie, { label: string; className: string; Icon: ComponentType<IconProps> }> = {
  bovino: { label: "Bovino", className: "bg-tierra-50 text-carbon border-tierra-50", Icon: IconCow },
  bubalino: { label: "Bubalino", className: "bg-campo-50 text-monte border-campo-50", Icon: IconBuffalo },
};

/** Chip de especie: la especie siempre visible (búfalo ≠ vaca). */
export function SpeciesChip({ especie, withIcon = false, label: labelOverride }: { especie: Especie; withIcon?: boolean; label?: string }) {
  const { className, Icon } = ESPECIE[especie];
  const label = labelOverride ?? ESPECIE[especie].label;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-[var(--radius-chip)] border px-2 py-0.5 text-[12px] font-medium leading-5",
        className,
      )}
    >
      {withIcon && <Icon size={14} />}
      {label}
    </span>
  );
}

/* ───────────────────────── Sincronización ───────────────────────── */

const SYNC: Record<EstadoSync, { label: string; className: string; Icon: ComponentType<IconProps> }> = {
  local: { label: "Guardado en el teléfono", className: "bg-tierra-50 text-carbon border-tierra-50", Icon: IconPhone },
  sincronizado: { label: "Sincronizado", className: "bg-success-bg text-success border-success-border", Icon: IconCheckCircle },
  anclado: { label: "Anclado", className: "bg-campo-50 text-monte border-campo-50", Icon: IconAnchor },
};

/** Indicador de sincronización en 3 estados: teléfono → sincronizado → anclado. */
export function SyncPill({ estado, count }: { estado: EstadoSync; count?: number }) {
  const { label, className, Icon } = SYNC[estado];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-semibold",
        className,
      )}
    >
      <Icon size={14} />
      {label}
      {count != null && <span className="tabular-nums">· {count}</span>}
    </span>
  );
}

/* ───────────────────────── KPI ───────────────────────── */

export function DeltaBadge({ delta }: { delta: Delta }) {
  const Icon = delta.direction === "up" ? IconArrowUp : IconArrowDown;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-0.5 rounded-[var(--radius-chip)] border px-1.5 py-px text-[11.5px] font-semibold tabular-nums",
        TONE_CLASS[delta.tone],
      )}
    >
      <Icon size={12} strokeWidth={2.25} />
      {delta.value}
    </span>
  );
}

/**
 * Tarjeta de indicador: chip de ícono 40 px con fondo tonal, número grande
 * tabular, etiqueta y delta con su referencia. Con `href` es clickeable.
 */
export function KpiCard({
  label,
  value,
  icon,
  delta,
  deltaHint,
  href,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  delta?: Delta;
  deltaHint?: string;
  href?: string;
}) {
  const body = (
    <div
      className={cx(
        "flex h-full gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-4",
        href && "transition-shadow hover:shadow-[var(--shadow-hover)]",
      )}
    >
      {icon && (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-campo-50 text-monte">{icon}</span>
      )}
      <div className="min-w-0">
        <p className="text-[27px] font-bold leading-8 tracking-[-0.02em] text-ink tabular-nums">{value}</p>
        <p className="text-[13px] text-muted">{label}</p>
        {delta && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted">
            <DeltaBadge delta={delta} />
            {deltaHint}
          </p>
        )}
      </div>
    </div>
  );
  if (!href) return body;
  return (
    <Link href={href} className="block rounded-[var(--radius-card)]">
      {body}
    </Link>
  );
}

/* ───────────────────────── Tabla ───────────────────────── */

/** Contenedor con scroll horizontal propio; la tabla mantiene un ancho mínimo legible. */
export function Table({ children, minWidth = 640 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[14px]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, numeric, className }: { children?: ReactNode; numeric?: boolean; className?: string }) {
  return (
    <th
      scope="col"
      className={cx(
        "border-b border-border px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted",
        numeric && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, numeric, className }: { children?: ReactNode; numeric?: boolean; className?: string }) {
  return (
    <td className={cx("border-b border-border px-5 py-3 align-middle text-ink", numeric && "text-right tabular-nums", className)}>
      {children}
    </td>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr className="transition-colors hover:bg-surface-2 [&:last-child>td]:border-b-0">{children}</tr>;
}

/* ───────────────────────── Estados vacíos y avisos ───────────────────────── */

/** Estado vacío: título + explicación + salida (qué pasa y qué hago). */
export function EmptyState({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-4 px-6 py-10 sm:flex-row sm:items-start sm:gap-5 sm:px-8">
      {icon && (
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] border border-border bg-crema text-campo">
          {icon}
        </span>
      )}
      <div className="max-w-[62ch]">
        <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
        <div className="mt-1.5 text-[15px] leading-relaxed text-muted">{description}</div>
        {children && <div className="mt-4">{children}</div>}
        {action && <div className="mt-5 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: Tone; title: string; children?: ReactNode }) {
  const Icon = tone === "danger" || tone === "warning" ? IconAlert : tone === "success" ? IconCheckCircle : IconInfo;
  return (
    <div role="status" className={cx("flex gap-3 rounded-[10px] border px-4 py-3 text-sm", TONE_CLASS[tone])}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 opacity-90">{children}</div>}
      </div>
    </div>
  );
}

/* ───────────────────────── Varios ───────────────────────── */

export function Progress({ value, label }: { value: number; label?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-ghost"
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="h-full rounded-full bg-campo" style={{ width: `${v}%` }} />
    </div>
  );
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-campo-50 font-semibold text-monte"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initials || "?"}
    </span>
  );
}

/* ───────────────────────── Formularios ───────────────────────── */

export const inputClass = cx(
  "h-11 w-full rounded-[var(--radius-control)] border border-border-strong bg-surface px-3 text-[15px] text-ink",
  "placeholder:text-subtle transition-colors focus:border-campo focus:outline-none focus-visible:outline-2 focus-visible:outline-campo",
);

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  /** Error del campo (validación local o 422 de la API). Reemplaza al hint. */
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-[13px] font-semibold text-ink">
        {label}
        {optional && <span className="text-[12px] font-normal text-muted">Opcional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="flex items-start gap-1.5 text-[12.5px] font-medium text-danger">
          <IconAlert size={14} className="mt-px shrink-0" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="text-[12.5px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** aria-* de un input según su Field (error o hint). */
export function fieldAria(id: string, error?: string, hint?: boolean) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputClass, "aria-[invalid=true]:border-danger", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cx(inputClass, "appearance-none pr-9 aria-[invalid=true]:border-danger", props.className)} />
      <IconChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        "min-h-[112px] w-full rounded-[var(--radius-control)] border border-border-strong bg-surface px-3 py-2.5 text-[15px] leading-relaxed text-ink",
        "placeholder:text-subtle transition-colors focus:border-campo focus:outline-none aria-[invalid=true]:border-danger",
        props.className,
      )}
    />
  );
}

/** Spinner chico para botones en curso. */
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block animate-spin rounded-full border-2 border-current border-r-transparent"
      style={{ width: size, height: size }}
    />
  );
}

/** Aviso de datos de ejemplo (adaptador lib/mock/*): siempre visible, nunca escondido. */
export function MockNotice({ what = "estos datos", text }: { what?: string; /** Texto completo (lo público lo traduce). */ text?: string }) {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] border border-dashed border-warning-border bg-warning-bg px-2 py-0.5 text-[12px] font-medium text-warning">
      <IconInfo size={14} className="shrink-0" />
      {text ?? `Datos de ejemplo: la API todavía no publica ${what}.`}
    </p>
  );
}

/** Pares etiqueta/valor densos (fichas). */
export function DataList({
  items,
  className,
}: {
  items: Array<{ label: string; value: ReactNode }>;
  className?: string;
}) {
  return (
    <dl className={cx("grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2", className)}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-[12px] font-medium text-muted">{it.label}</dt>
          <dd className="mt-0.5 text-[14.5px] text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Tabs de filtro como links: el estado vive en la URL (persistente y compartible). */
export function FilterTabs({
  items,
  label,
}: {
  label: string;
  items: Array<{ href: string; label: string; count?: number; active: boolean }>;
}) {
  return (
    <nav aria-label={label} className="inline-flex flex-wrap gap-1 rounded-[10px] bg-surface-2 p-1">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={it.active ? "page" : undefined}
          className={cx(
            "inline-flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-[13px] font-medium transition-colors",
            it.active ? "bg-surface text-ink ring-1 ring-border" : "text-muted hover:text-ink",
          )}
        >
          {it.label}
          {it.count != null && <span className="tabular-nums text-subtle">{it.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

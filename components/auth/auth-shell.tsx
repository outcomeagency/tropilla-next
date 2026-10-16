import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { IconCheckCircle } from "@/components/icons";
import { PHOTOS, type PhotoKey } from "@/lib/photos";

const PUNTOS = [
  "Hacienda, sanidad, reproducción y documentos en un solo lugar",
  "Bovinos y búfalos, cada uno con sus categorías",
  "Cada dato con autor, fecha e historial: nada se borra",
];

/**
 * Marco de las pantallas de cuenta: momento de marca en verde monte con una
 * foto real de campo (sin degradados ni ilustraciones) y el formulario sobre
 * blanco. En móvil queda sólo el formulario con el logo arriba.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  photo = "bufalosPastizal",
  headline = "Todo tu campo, en un solo lugar.",
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  photo?: PhotoKey;
  headline?: string;
}) {
  const p = PHOTOS[photo];
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 bg-sidebar px-10 pb-10 pt-9 text-sidebar-ink lg:flex xl:px-12">
        <Link href="/es" aria-label="TROPILLA — portal público" className="self-start">
          <Logo onDark height={38} />
        </Link>

        <figure className="relative min-h-[220px] flex-1 overflow-hidden rounded-[16px] border border-sidebar-border">
          <Image src={p.src} alt={p.alt} fill sizes="(min-width:1024px) 40vw, 0px" className="object-cover" quality={75} />
          <figcaption className="absolute bottom-3 left-3 rounded-[var(--radius-chip)] bg-sidebar px-2.5 py-1 text-[12px] font-medium text-sidebar-ink">
            {p.alt}
          </figcaption>
        </figure>

        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">Hecho en Corrientes, para el NEA</p>
          <p className="mt-2.5 font-display text-[clamp(30px,2.6vw,40px)] font-bold leading-[1.06] tracking-[-0.03em]">{headline}</p>
          <ul className="mt-6 space-y-2.5">
            {PUNTOS.map((punto) => (
              <li key={punto} className="flex gap-3 text-[14.5px] text-sidebar-ink">
                <IconCheckCircle size={19} className="mt-0.5 shrink-0 text-sidebar-muted" />
                {punto}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex flex-col bg-surface px-4 py-8 sm:px-10">
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-6">
          <Link href="/es" aria-label="TROPILLA" className="mb-10 self-start lg:hidden">
            <Logo height={34} />
          </Link>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
          {subtitle && <div className="mt-2 text-[15px] leading-relaxed text-muted">{subtitle}</div>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 border-t border-border pt-5 text-[14px] text-muted">{footer}</div>}
        </div>
        <p className="mx-auto w-full max-w-[420px] text-[12px] text-subtle">
          TROPILLA · La plataforma integral del productor ganadero del NEA.
        </p>
      </main>
    </div>
  );
}

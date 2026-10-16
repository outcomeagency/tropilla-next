import type { ComponentType } from "react";
import { Avatar, Badge, TrustBadge } from "@/components/ui";
import { IconCow, IconFile, IconHeart, IconMap, IconRoute, IconScale, IconSyringe, IconTag, type IconProps } from "@/components/icons";
import { ROL_LABEL } from "@/lib/auth";
import { fecha } from "@/lib/format";
import type { S } from "@/lib/schemas";

const ICONO: Record<string, ComponentType<IconProps>> = {
  "hacienda.pesaje": IconScale,
  "hacienda.traslado": IconMap,
  "hacienda.cambio_lote": IconRoute,
  "hacienda.alta": IconTag,
  "hacienda.identificacion": IconTag,
};

function iconoDe(tipo = ""): ComponentType<IconProps> {
  if (ICONO[tipo]) return ICONO[tipo];
  if (tipo.startsWith("sanidad.")) return IconSyringe;
  if (tipo.startsWith("reproduccion.")) return IconHeart;
  if (tipo.startsWith("documento")) return IconFile;
  return IconCow;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/**
 * Timeline append-only del animal (TPA-17): cada evento con autor, rol, fecha
 * y nivel de confianza. Correcciones y anulaciones se muestran, nunca se ocultan.
 */
export function Timeline({ eventos }: { eventos: S<"EventoResumen">[] }) {
  const grupos = new Map<string, S<"EventoResumen">[]>();
  for (const e of eventos) {
    const k = (e.ocurrido_en ?? "").slice(0, 7);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(e);
  }
  return (
    <div className="space-y-6">
      {[...grupos.entries()].map(([mes, lista]) => {
        const [y, m] = mes.split("-");
        return (
          <section key={mes}>
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
              {MESES[Number(m) - 1]} {y}
            </h3>
            <ol className="relative">
              {lista.map((e, i) => {
                const Icon = iconoDe(e.tipo);
                return (
                  <li key={e.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < lista.length - 1 && <span aria-hidden="true" className="absolute left-[19px] top-10 h-[calc(100%-36px)] w-px bg-border-strong" />}
                    <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface text-monte">
                      <Icon size={20} />
                    </span>
                    <div className={e.anulado ? "min-w-0 flex-1 opacity-60" : "min-w-0 flex-1"}>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="text-[14.5px] text-ink">
                          <span className={e.anulado ? "font-semibold line-through" : "font-semibold"}>{e.tipo_nombre ?? e.tipo}</span>
                          {e.resumen && <span className="text-muted"> · {e.resumen}</span>}
                        </p>
                        <span className="text-[12.5px] tabular-nums text-muted">{fecha(e.ocurrido_en)}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {e.autor?.nombre && (
                          <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                            <Avatar name={e.autor.nombre} size={20} />
                            {e.autor.nombre}
                            {e.autor.rol && ` · ${ROL_LABEL[e.autor.rol as keyof typeof ROL_LABEL] ?? e.autor.rol}`}
                          </span>
                        )}
                        <TrustBadge nivel={e.confianza ?? "declarado"} />
                        {(e.version ?? 1) > 1 && <Badge tone="info">Corregido · v{e.version}</Badge>}
                        {e.corregido && <Badge tone="neutral">Tiene una versión más nueva</Badge>}
                        {e.anulado && <Badge tone="danger">Anulado</Badge>}
                        {e.heredado_de_lote && <Badge tone="neutral">Heredado del lote</Badge>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

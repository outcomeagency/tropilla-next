import { Badge, Table, Td, Th, cx } from "@/components/ui";
import { IconLock } from "@/components/icons";
import { ESCALAS, METRICAS, MOTIVOS, trimestre, type MetricaCodigo } from "@/lib/agregados";
import { nf } from "@/lib/format";
import type { Tablero } from "@/lib/data/agregados";

type Fila = Tablero["filas"][number];

export function valorMetrica(metrica: MetricaCodigo, v: Fila["valores"]): string {
  if (!v) return "—";
  if (metrica === "existencias") return nf.format(v.cabezas ?? 0);
  if (metrica === "cobertura_sanitaria") return `${v.cobertura_pct ?? 0} %`;
  return `$ ${nf.format(v.precio_kg ?? 0)}`;
}

function numero(metrica: MetricaCodigo, v: Fila["valores"]): number | null {
  if (!v) return null;
  return (metrica === "existencias" ? v.cabezas : metrica === "cobertura_sanitaria" ? v.cobertura_pct : v.precio_kg) ?? null;
}

const pct = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1, signDisplay: "exceptZero" });

/**
 * Tabla zona × trimestre del cubo protegido. Las celdas reservadas muestran el motivo (ícono + texto, nunca solo color);
 * la variación contra el trimestre anterior aparece solo si las dos celdas están publicadas.
 */
export function TablaCubo({ data }: { data: Tablero }) {
  const metrica = data.metrica as MetricaCodigo;
  const k = data.politica.k_minimo;
  const p = data.politica.dominancia_max_pct;
  const grupos = new Map<string, { zona: Fila["zona"]; escala: Fila["escala"]; celdas: Map<string, Fila> }>();
  for (const f of data.filas) {
    const clave = `${f.zona.codigo}|${f.escala}`;
    if (!grupos.has(clave)) grupos.set(clave, { zona: f.zona, escala: f.escala, celdas: new Map() });
    grupos.get(clave)!.celdas.set(f.trimestre, f);
  }
  return (
    <Table minWidth={260 + data.trimestres.length * 150}>
      <thead>
        <tr>
          <Th>Zona</Th>
          {data.trimestres.map((t) => (
            <Th key={t} numeric>
              {trimestre(t)}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...grupos.values()].map((g) => {
          const total = g.escala === "todas";
          return (
            <tr key={`${g.zona.codigo}|${g.escala}`} className={cx("[&:last-child>td]:border-b-0", g.zona.codigo === "nea" && total && "bg-surface-2/60")}>
              <Td className={cx(!total && "pl-10")}>
                <p className={cx("text-[14px]", total ? "font-semibold text-ink" : "text-muted")}>
                  {total ? (g.zona.codigo === "nea" ? "NEA (total)" : g.zona.nombre) : ESCALAS[g.escala]}
                </p>
                {total && data.desglose_escala && <p className="text-[12px] text-subtle">Todas las escalas</p>}
              </Td>
              {data.trimestres.map((t, i) => {
                const c = g.celdas.get(t);
                if (!c || c.estado === "sin_datos") {
                  return (
                    <Td key={t} numeric className="text-subtle">
                      <span className="text-[13px]">Sin datos</span>
                    </Td>
                  );
                }
                if (c.estado === "suprimida") {
                  const m = MOTIVOS[c.motivo ?? ""] ?? { label: "Reservada", detalle: () => "" };
                  return (
                    <Td key={t} numeric>
                      <span title={m.detalle(k, p)} className="inline-flex flex-col items-end gap-0.5">
                        <Badge icon={<IconLock size={12} />}>Reservada</Badge>
                        <span className="text-[11.5px] text-muted">{m.label}</span>
                      </span>
                    </Td>
                  );
                }
                const anterior = i > 0 ? numero(metrica, g.celdas.get(data.trimestres[i - 1])?.valores ?? null) : null;
                const actual = numero(metrica, c.valores);
                const delta = anterior && actual != null ? (metrica === "cobertura_sanitaria" ? actual - anterior : ((actual - anterior) / anterior) * 100) : null;
                return (
                  <Td key={t} numeric>
                    <p className="font-semibold text-ink">{valorMetrica(metrica, c.valores)}</p>
                    <p className="text-[12px] text-muted">
                      ≈ {nf.format(c.valores?.establecimientos ?? 0)} est.
                      {delta != null && (
                        <span className="ml-1.5 font-medium text-ink">
                          {pct.format(delta)}
                          {metrica === "cobertura_sanitaria" ? " pp" : " %"}
                        </span>
                      )}
                    </p>
                  </Td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

export function LeyendaMotivos({ k, p }: { k: number; p: number }) {
  return (
    <ul className="grid gap-3 text-[13px] text-muted sm:grid-cols-3">
      {Object.entries(MOTIVOS).map(([codigo, m]) => (
        <li key={codigo} className="flex gap-2">
          <IconLock size={14} className="mt-0.5 shrink-0 text-subtle" />
          <span>
            <span className="font-semibold text-ink">{m.label}.</span> {m.detalle(k, p)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export const UNIDAD = (m: MetricaCodigo) => METRICAS[m].unidad;

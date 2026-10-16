import { Badge, Table, Td, Th, Tr } from "@/components/ui";
import { IconAlert } from "@/components/icons";
import { fecha } from "@/lib/format";
import { atipico, diasEntre, fmtGdp, fmtKg, type PuntoPeso } from "@/lib/pesajes";

const W = 640;
const H = 200;
const PAD = { t: 16, r: 16, b: 28, l: 44 };

/**
 * Curva de peso del animal (TPA-23): línea con cada pesaje y la ganancia
 * diaria entre pesajes. SVG sin librerías; colores por token.
 */
export function CurvaPeso({ puntos }: { puntos: PuntoPeso[] }) {
  const ps = [...puntos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const kgs = ps.map((p) => p.kg);
  const min = Math.min(...kgs);
  const max = Math.max(...kgs);
  const paso = niceStep((max - min) / 3 || max / 4 || 50);
  const y0 = Math.max(0, Math.floor(min / paso) * paso - (max === min ? paso : 0));
  const y1 = Math.ceil(max / paso) * paso + (max === min ? paso : 0);
  const t0 = Date.parse(ps[0].fecha);
  const t1 = Date.parse(ps.at(-1)!.fecha);
  const x = (f: string) => PAD.l + (t1 === t0 ? (W - PAD.l - PAD.r) / 2 : ((Date.parse(f) - t0) / (t1 - t0)) * (W - PAD.l - PAD.r));
  const y = (kg: number) => PAD.t + (1 - (kg - y0) / (y1 - y0 || 1)) * (H - PAD.t - PAD.b);
  const ticks: number[] = [];
  for (let v = y0; v <= y1 + 0.001; v += paso) ticks.push(v);
  const d = ps.map((p, i) => `${i ? "L" : "M"}${x(p.fecha).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Curva de peso: ${ps.map((p) => `${fecha(p.fecha)} ${fmtKg(p.kg)}`).join(", ")}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="fill-muted text-[11px] tabular-nums">
              {Math.round(v)}
            </text>
          </g>
        ))}
        <path d={d} fill="none" className="stroke-campo" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {ps.map((p) => {
          const cx = x(p.fecha);
          const cy = y(p.kg);
          if (p.fuente === "nacimiento") return <rect key={`${p.fecha}${p.kg}`} x={cx - 4} y={cy - 4} width={8} height={8} className="fill-surface stroke-campo" strokeWidth={2} />;
          if (p.fuente === "destete") return <path key={`${p.fecha}${p.kg}`} d={`M${cx},${cy - 5} L${cx + 5},${cy} L${cx},${cy + 5} L${cx - 5},${cy} Z`} className="fill-campo stroke-surface" strokeWidth={1.5} />;
          return <circle key={`${p.fecha}${p.kg}`} cx={cx} cy={cy} r={4.5} className={p.heredado ? "fill-surface stroke-campo" : "fill-campo stroke-surface"} strokeWidth={2} />;
        })}
        <text x={PAD.l} y={H - 8} className="fill-muted text-[11px]">
          {fecha(ps[0].fecha)}
        </text>
        {ps.length > 1 && (
          <text x={W - PAD.r} y={H - 8} textAnchor="end" className="fill-muted text-[11px]">
            {fecha(ps.at(-1)!.fecha)}
          </text>
        )}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 text-[12px] text-muted">
        {ps.some((p) => p.fuente === "pesaje" && !p.heredado) && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-campo" /> Pesaje propio</span>}
        {ps.some((p) => p.heredado) && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-campo bg-surface" /> Heredado del lote
          </span>
        )}
        {ps.some((p) => p.fuente === "nacimiento") && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 border-2 border-campo bg-surface" /> Nacimiento</span>}
        {ps.some((p) => p.fuente === "destete") && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 bg-campo" /> Destete</span>}
      </figcaption>
    </figure>
  );
}

/** Tabla de pesajes con días y GDP entre cada uno (más nuevo arriba). */
export function TablaPesajes({ puntos }: { puntos: PuntoPeso[] }) {
  const ps = [...puntos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const filas = ps.map((p, i) => ({ p, prev: i ? ps[i - 1] : null })).reverse();
  return (
    <Table minWidth={480}>
      <thead>
        <tr>
          <Th>Fecha</Th>
          <Th numeric>Peso</Th>
          <Th numeric>Días</Th>
          <Th numeric>Ganancia diaria</Th>
        </tr>
      </thead>
      <tbody>
        {filas.map(({ p, prev }) => {
          const g = p.gdp_kg_dia ?? null;
          const raro = prev && p.fuente === "pesaje" && prev.fuente === "pesaje" ? atipico(prev, p) : false;
          return (
            <Tr key={`${p.fecha}${p.kg}${p.id ?? ""}`}>
              <Td className="tabular-nums">
                {fecha(p.fecha)}
                <span className="ml-2 text-[12px] text-muted">{p.fuente === "nacimiento" ? "nacimiento" : p.fuente === "destete" ? "destete" : p.heredado ? "heredado del lote" : p.modo === "promedio" ? "promedio" : "pesaje"}</span>
              </Td>
              <Td numeric className="font-semibold">
                {fmtKg(p.kg)}
              </Td>
              <Td numeric className="text-muted">
                {prev ? diasEntre(prev.fecha, p.fecha) : "—"}
              </Td>
              <Td numeric>
                {raro ? (
                  <Badge tone="warning" icon={<IconAlert size={14} />}>
                    Difiere más de 30 %
                  </Badge>
                ) : g == null ? (
                  <span className="text-muted">—</span>
                ) : (
                  <span className={g < 0 ? "font-semibold text-danger" : "font-semibold text-ink"}>{fmtGdp(g)}</span>
                )}
              </Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}

function niceStep(raw: number) {
  const p = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

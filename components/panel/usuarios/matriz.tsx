import { IconCheck, IconEye, IconLock, IconPlus } from "@/components/icons";
import { cx } from "@/components/ui";

type Nivel = "total" | "publicar" | "crear" | "ver" | "no";
const ROLES = ["Dueño", "Administrador", "Encargado", "Asesor / vet", "Solo lectura"];

/** functional/04-modulos.md §12 — la UI la muestra, la API la aplica (abilities). */
const MATRIZ: Array<{ modulo: string; niveles: Nivel[]; nota?: string }> = [
  { modulo: "Hacienda, reproducción y sanidad", niveles: ["total", "total", "total", "total", "ver"] },
  { modulo: "Documentos sanitarios y generales", niveles: ["total", "total", "crear", "crear", "ver"] },
  { modulo: "Documentos fiscales", niveles: ["total", "total", "no", "no", "no"], nota: "Facturas, DT-e con montos, liquidaciones" },
  { modulo: "Precios de compra y venta", niveles: ["total", "total", "no", "no", "no"] },
  { modulo: "Comercialización, perfil y contratos", niveles: ["publicar", "publicar", "no", "ver", "no"] },
  { modulo: "Usuarios y roles", niveles: ["total", "total", "no", "no", "no"], nota: "El administrador no puede quitar al dueño" },
];

const NIVEL: Record<Nivel, { label: string; className: string; Icon: typeof IconCheck }> = {
  total: { label: "Carga, ve y corrige", className: "text-success", Icon: IconCheck },
  publicar: { label: "Todo + publicar", className: "text-success", Icon: IconCheck },
  crear: { label: "Carga y ve", className: "text-info", Icon: IconPlus },
  ver: { label: "Sólo ve", className: "text-neutral", Icon: IconEye },
  no: { label: "Sin acceso", className: "text-subtle", Icon: IconLock },
};

/** Matriz de permisos legible (flujo 16): texto + ícono en cada celda, nunca sólo color. */
export function MatrizPermisos({ destacar }: { destacar?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-left text-[13.5px]">
        <thead>
          <tr>
            <th scope="col" className="border-b border-border px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
              Módulo
            </th>
            {ROLES.map((r, i) => (
              <th
                key={r}
                scope="col"
                className={cx(
                  "border-b border-border px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em]",
                  destacar === i ? "bg-campo-50 text-monte" : "text-muted",
                )}
              >
                {r}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIZ.map((m) => (
            <tr key={m.modulo} className="[&:last-child>*]:border-b-0">
              <th scope="row" className="border-b border-border px-5 py-3 align-top font-medium text-ink">
                {m.modulo}
                {m.nota && <span className="block text-[12px] font-normal text-muted">{m.nota}</span>}
              </th>
              {m.niveles.map((n, i) => {
                const { label, className, Icon } = NIVEL[n];
                return (
                  <td key={i} className={cx("border-b border-border px-3 py-3 align-top", destacar === i && "bg-campo-50/60")}>
                    <span className={cx("inline-flex items-center gap-1.5 font-medium", className)}>
                      <Icon size={15} className="shrink-0" />
                      <span className={n === "no" ? "text-muted" : "text-ink"}>{label}</span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border px-5 py-3 text-[12.5px] text-muted">
        Nadie borra: corregir y anular dejan una versión nueva con motivo. Los permisos los aplica la API; esta tabla los explica.
      </p>
    </div>
  );
}

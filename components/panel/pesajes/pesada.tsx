"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { buscarAnimalAction, type AnimalElegido } from "@/lib/evento-actions";
import { registrarPesadaAction, type PesadaState } from "@/lib/pesaje-actions";
import { atipico, diasEntre, fmtGdp, fmtKg, gdp } from "@/lib/pesajes";
import { uuidv7 } from "@/lib/uuid";
import { ChoiceChip, SwitchRow } from "@/components/choice";
import { Badge, Button, Card, CardHeader, Field, Input, Notice, Spinner, cx, fieldAria, inputClass } from "@/components/ui";
import { IconAlert, IconCheckCircle, IconClose, IconScale } from "@/components/icons";
import { fecha as fmtFecha } from "@/lib/format";

type Fila = { key: string; busca: string; animal: AnimalElegido | null; peso: string; err?: string; buscando?: boolean };

const nueva = (): Fila => ({ key: uuidv7(), busca: "", animal: null, peso: "" });
const num = (s: string) => {
  const t = s.replace(/\s/g, "").replace(",", ".");
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};

/**
 * Sesión de pesada (TPA-23): caravana → Enter → peso → Enter, como en la
 * manga. Muestra el peso anterior, la ganancia diaria en vivo y avisa antes
 * de guardar si el peso difiere más de 30 % en menos de 30 días.
 */
export function Pesada({ hoy, iniciales }: { hoy: string; iniciales: AnimalElegido[] }) {
  const [state, action, pending] = useActionState<PesadaState, FormData>(registrarPesadaAction, {});
  const [filas, setFilas] = useState<Fila[]>(() => [...iniciales.map((a) => ({ ...nueva(), busca: a.ident, animal: a })), nueva()]);
  const [fecha, setFecha] = useState(hoy);
  const [metodo, setMetodo] = useState("balanza");
  const [desbaste, setDesbaste] = useState(false);
  const refs = useRef(new Map<string, HTMLInputElement | null>());
  const [visto, setVisto] = useState<number | undefined>(undefined);

  // Al volver de la API: sacar las guardadas, conservar el resto con su aviso.
  if (state.ts && state.ts !== visto) {
    setVisto(state.ts);
    const ok = new Set(state.guardadas ?? []);
    const quedan = filas.filter((f) => !ok.has(f.key) && (f.animal || f.busca));
    setFilas([...quedan, nueva()]);
  }

  const foco = (key: string, campo: "busca" | "peso") => setTimeout(() => refs.current.get(`${campo}:${key}`)?.focus(), 0);
  const set = (key: string, cambios: Partial<Fila>) => setFilas((xs) => xs.map((f) => (f.key === key ? { ...f, ...cambios } : f)));

  async function buscar(f: Fila) {
    const v = f.busca.trim();
    if (!v) return;
    if (filas.some((o) => o.key !== f.key && o.animal && o.animal.ident.toUpperCase() === v.toUpperCase())) return set(f.key, { err: "Ya está en la pesada." });
    set(f.key, { buscando: true, err: undefined });
    const r = await buscarAnimalAction(v);
    if (!r.animal) return set(f.key, { buscando: false, animal: null, err: r.error });
    if (r.animal.estado && r.animal.estado !== "activo") return set(f.key, { buscando: false, animal: null, err: `${r.animal.ident} figura como ${r.animal.estado}.` });
    set(f.key, { buscando: false, animal: r.animal, busca: r.animal.ident });
    foco(f.key, "peso");
  }

  function siguiente(f: Fila) {
    const idx = filas.findIndex((x) => x.key === f.key);
    if (idx === filas.length - 1) {
      const n = nueva();
      setFilas((xs) => [...xs, n]);
      foco(n.key, "busca");
    } else foco(filas[idx + 1].key, "busca");
  }

  const listas = filas.filter((f) => f.animal && num(f.peso));
  const avisos = state.avisos ?? {};
  const conAviso = listas.filter((f) => avisos[f.key]);

  function enviar(e: FormEvent<HTMLFormElement>, confirmar = false) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("filas", JSON.stringify(listas.map((f) => ({ key: f.key, animal_id: f.animal!.id, ident: f.animal!.ident, peso: f.peso }))));
    const sub = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (confirmar || sub?.value === "confirmar") for (const f of conAviso) fd.append("confirmar_key", f.key);
    startTransition(() => action(fd));
  }

  useEffect(() => {
    if (!iniciales.length) return;
    foco(filas[0].key, "peso");
    // Sólo al montar, con un animal precargado desde la ficha.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form onSubmit={enviar} noValidate>
      <Card className="overflow-hidden">
        <CardHeader title="Sesión de pesada" description="Caravana y Enter, peso y Enter: pasa a la fila siguiente. Se guarda un pesaje por animal." />
        <div className="grid gap-4 border-b border-border bg-base px-5 py-4 md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)]">
          <Field label="Fecha" htmlFor="ocurrido_en" error={state.fields?.ocurrido_en}>
            <Input id="ocurrido_en" name="ocurrido_en" type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} {...fieldAria("ocurrido_en", state.fields?.ocurrido_en)} />
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink">Cómo se pesó</legend>
            <div className="flex flex-wrap gap-2">
              {[
                ["balanza", "Balanza"],
                ["cinta", "Cinta"],
                ["estimado", "A ojo"],
              ].map(([v, l]) => (
                <ChoiceChip key={v} type="radio" name="metodo" value={v} label={l} checked={metodo === v} onChange={() => setMetodo(v)} className="h-10" />
              ))}
            </div>
          </fieldset>
          <div className="-my-3">
            <SwitchRow name="desbaste" label="Con desbaste" description="Ayuno previo; el peso es comparable entre pesadas." checked={desbaste} onChange={(e) => setDesbaste(e.target.checked)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
                <th className="w-[44px] border-b border-border py-2.5 pl-5 pr-2">#</th>
                <th className="w-[200px] border-b border-border px-2 py-2.5">Caravana</th>
                <th className="border-b border-border px-2 py-2.5">Animal</th>
                <th className="w-[150px] border-b border-border px-2 py-2.5 text-right">Peso anterior</th>
                <th className="w-[140px] border-b border-border px-2 py-2.5 text-right">Peso hoy</th>
                <th className="w-[170px] border-b border-border px-2 py-2.5 text-right">Ganancia diaria</th>
                <th className="w-[52px] border-b border-border py-2.5 pr-5" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => {
                const kg = num(f.peso);
                const ant = f.animal?.peso && f.animal.pesoFecha ? { kg: Number(f.animal.peso), fecha: f.animal.pesoFecha } : null;
                const hoyP = kg ? { kg, fecha } : null;
                const g = ant && hoyP ? gdp(ant, hoyP) : null;
                const raro = ant && hoyP ? atipico(ant, hoyP) : false;
                const err = state.errores?.[f.key] ?? f.err;
                const aviso = avisos[f.key];
                return (
                  <tr key={f.key} className={cx("align-top", (raro || aviso) && "bg-warning-bg/50", err && "bg-danger-bg/40")}>
                    <td className="border-b border-border py-3 pl-5 pr-2 tabular-nums text-muted">{i + 1}</td>
                    <td className="border-b border-border px-2 py-2">
                      <div className="relative">
                        <input
                          ref={(el) => {
                            refs.current.set(`busca:${f.key}`, el);
                          }}
                          aria-label={`Caravana fila ${i + 1}`}
                          value={f.busca}
                          onChange={(e) => set(f.key, { busca: e.target.value, animal: null, err: undefined })}
                          onBlur={() => f.busca && !f.animal && void buscar(f)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (f.animal) foco(f.key, "peso");
                              else void buscar(f);
                            }
                          }}
                          placeholder="0142"
                          className={cx(inputClass, "h-10 tabular-nums")}
                        />
                        {f.buscando && <span className="absolute right-3 top-3"><Spinner /></span>}
                      </div>
                    </td>
                    <td className="border-b border-border px-2 py-3">
                      {f.animal ? (
                        <span>
                          <span className="font-medium text-ink">{f.animal.categoria}</span>
                          {f.animal.lote && <span className="block text-[12.5px] text-muted">{f.animal.lote}</span>}
                        </span>
                      ) : err ? (
                        <span className="text-[13px] font-medium text-danger">{err}</span>
                      ) : (
                        <span className="text-[13px] text-subtle">—</span>
                      )}
                      {f.animal && err && <span className="block text-[12.5px] font-medium text-danger">{err}</span>}
                      {aviso && (
                        <span className="mt-1 flex items-start gap-1.5 text-[12.5px] font-medium text-warning">
                          <IconAlert size={14} className="mt-0.5 shrink-0" /> {aviso.join(" ")}
                        </span>
                      )}
                    </td>
                    <td className="border-b border-border px-2 py-3 text-right tabular-nums">
                      {ant ? (
                        <>
                          <span className="text-ink">{fmtKg(ant.kg)}</span>
                          <span className="block text-[12px] text-muted">
                            {fmtFecha(ant.fecha, true)} · hace {diasEntre(ant.fecha, fecha)} d
                          </span>
                        </>
                      ) : (
                        <span className="text-subtle">{f.animal ? "Primer pesaje" : "—"}</span>
                      )}
                    </td>
                    <td className="border-b border-border px-2 py-2">
                      <div className="relative">
                        <input
                          ref={(el) => {
                            refs.current.set(`peso:${f.key}`, el);
                          }}
                          aria-label={`Peso fila ${i + 1}`}
                          inputMode="decimal"
                          value={f.peso}
                          disabled={!f.animal}
                          onChange={(e) => set(f.key, { peso: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (num(f.peso)) siguiente(f);
                            }
                          }}
                          className="h-10 w-full rounded-[var(--radius-control)] border border-border-strong bg-surface pl-3 pr-9 text-right text-[15px] font-semibold tabular-nums text-ink focus:border-campo focus:outline-none disabled:bg-base"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">kg</span>
                      </div>
                    </td>
                    <td className="border-b border-border px-2 py-3 text-right tabular-nums">
                      {raro ? (
                        <Badge tone="warning" icon={<IconAlert size={14} />}>
                          Difiere {Math.round((Math.abs(hoyP!.kg - ant!.kg) / ant!.kg) * 100)} %
                        </Badge>
                      ) : g != null ? (
                        <span className={g < 0 ? "font-semibold text-danger" : "font-semibold text-ink"}>{fmtGdp(g)}</span>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                    <td className="border-b border-border py-2 pr-5 text-right">
                      {(f.animal || f.busca) && (
                        <button
                          type="button"
                          aria-label={`Quitar fila ${i + 1}`}
                          onClick={() => setFilas((xs) => (xs.length === 1 ? [nueva()] : xs.filter((x) => x.key !== f.key)))}
                          className="grid h-10 w-9 place-items-center rounded-[8px] text-muted hover:bg-base hover:text-ink"
                        >
                          <IconClose size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 px-5 py-4">
          {(state.total ?? 0) > 0 && !pending && (
            <Notice tone="success" title={`${state.total} ${state.total === 1 ? "pesaje guardado" : "pesajes guardados"} en esta sesión.`}>
              Ya actualizaron el peso y la ganancia diaria de cada animal.
            </Notice>
          )}
          {state.error && <Notice tone="danger" title={state.error} />}
          {conAviso.length > 0 && (
            <div role="alert" className="rounded-[10px] border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning">
              <p className="flex items-center gap-2 font-semibold">
                <IconAlert size={18} /> {conAviso.length === 1 ? "Un pesaje quedó sin guardar" : `${conAviso.length} pesajes quedaron sin guardar`}: revisá el aviso de la fila.
              </p>
              <p className="mt-1 pl-7">Si el peso está bien (por ejemplo, otra balanza o una carga previa equivocada), guardalo igual: queda registrado que lo confirmaste.</p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-muted">
              {listas.length ? (
                <>
                  <span className="font-semibold tabular-nums text-ink">{listas.length}</span> {listas.length === 1 ? "pesaje listo" : "pesajes listos"} para guardar
                </>
              ) : (
                "Cargá caravana y peso para empezar."
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {conAviso.length > 0 && (
                <Button type="submit" name="modo" value="confirmar" variant="outline" disabled={pending}>
                  Guardar igual
                </Button>
              )}
              <Button type="submit" disabled={pending || !listas.length} icon={pending ? <Spinner /> : <IconScale size={18} />}>
                Guardar {listas.length > 1 ? `${listas.length} pesajes` : "pesaje"}
              </Button>
            </div>
          </div>
          {(state.total ?? 0) > 0 && (
            <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
              <IconCheckCircle size={14} /> Cada pesaje queda en la historia del animal con tu nombre y su huella.
            </p>
          )}
        </div>
      </Card>
    </form>
  );
}

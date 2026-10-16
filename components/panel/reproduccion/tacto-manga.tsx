"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import { buscarAnimalAction, type AnimalElegido } from "@/lib/evento-actions";
import { registrarTactosAction } from "@/lib/tacto-actions";
import type { PesadaState } from "@/lib/pesaje-actions";
import { fpp, gestacion, type Gestaciones } from "@/lib/gestacion";
import { uuidv7 } from "@/lib/uuid";
import { fecha as fmtFecha } from "@/lib/format";
import { ChoiceChip } from "@/components/choice";
import { Badge, Button, Card, CardHeader, Field, Input, Notice, Spinner, cx, fieldAria, inputClass } from "@/components/ui";
import { IconAlert, IconClose, IconHeart } from "@/components/icons";

type Fila = { key: string; busca: string; animal: AnimalElegido | null; resultado: "prenada" | "vacia" | ""; dias: string; err?: string; buscando?: boolean };
const nueva = (): Fila => ({ key: uuidv7(), busca: "", animal: null, resultado: "", dias: "" });

/**
 * Sesión de tacto en la manga (TPA-28): caravana ↵ · P o V · días ↵, y a
 * la fila siguiente. La fecha probable de parto se ve en vivo con la
 * gestación de la especie y la raza de cada hembra.
 */
export function TactoManga({ hoy, gestaciones }: { hoy: string; gestaciones: Gestaciones }) {
  const [state, action, pending] = useActionState<PesadaState, FormData>(registrarTactosAction, {});
  const [filas, setFilas] = useState<Fila[]>(() => [nueva()]);
  const [fecha, setFecha] = useState(hoy);
  const [metodo, setMetodo] = useState("tacto");
  const refs = useRef(new Map<string, HTMLElement | null>());
  const [visto, setVisto] = useState<number | undefined>(undefined);

  if (state.ts && state.ts !== visto) {
    setVisto(state.ts);
    const ok = new Set(state.guardadas ?? []);
    setFilas([...filas.filter((f) => !ok.has(f.key) && (f.animal || f.busca)), nueva()]);
  }

  const foco = (key: string, campo: "busca" | "pv" | "dias") => setTimeout(() => refs.current.get(`${campo}:${key}`)?.focus(), 0);
  const set = (key: string, c: Partial<Fila>) => setFilas((xs) => xs.map((f) => (f.key === key ? { ...f, ...c } : f)));
  const siguiente = (f: Fila) => {
    const i = filas.findIndex((x) => x.key === f.key);
    if (i === filas.length - 1) {
      const n = nueva();
      setFilas((xs) => [...xs, n]);
      foco(n.key, "busca");
    } else foco(filas[i + 1].key, "busca");
  };

  async function buscar(f: Fila) {
    const v = f.busca.trim();
    if (!v) return;
    if (filas.some((o) => o.key !== f.key && o.animal?.ident.toUpperCase() === v.toUpperCase())) return set(f.key, { err: "Ya está en la sesión." });
    set(f.key, { buscando: true, err: undefined });
    const r = await buscarAnimalAction(v);
    if (!r.animal) return set(f.key, { buscando: false, animal: null, err: r.error });
    if (r.animal.sexo !== "H") return set(f.key, { buscando: false, animal: null, err: `${r.animal.ident} es macho.` });
    if (r.animal.estado && r.animal.estado !== "activo") return set(f.key, { buscando: false, animal: null, err: `${r.animal.ident} figura como ${r.animal.estado}.` });
    set(f.key, { buscando: false, animal: r.animal, busca: r.animal.ident });
    foco(f.key, "pv");
  }

  const listas = filas.filter((f) => f.animal && (f.resultado === "vacia" || (f.resultado === "prenada" && Number(f.dias) > 0)));
  const avisos = state.avisos ?? {};
  const conAviso = listas.filter((f) => avisos[f.key]);
  const prenadas = listas.filter((f) => f.resultado === "prenada").length;

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("filas", JSON.stringify(listas.map((f) => ({ key: f.key, animal_id: f.animal!.id, resultado: f.resultado, dias: f.dias }))));
    const sub = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (sub?.value === "confirmar") for (const f of conAviso) fd.append("confirmar_key", f.key);
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={enviar} noValidate>
      <Card className="overflow-hidden">
        <CardHeader title="Planilla de la manga" description="Caravana ↵ · tecla P (preñada) o V (vacía) · días ↵. Se guarda un tacto por hembra." />
        <div className="grid gap-4 border-b border-border bg-base px-5 py-4 md:grid-cols-[180px_auto_minmax(0,1fr)]">
          <Field label="Fecha" htmlFor="ocurrido_en" error={state.fields?.ocurrido_en}>
            <Input id="ocurrido_en" name="ocurrido_en" type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} {...fieldAria("ocurrido_en", state.fields?.ocurrido_en)} />
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink">Método</legend>
            <div className="flex gap-2">
              <ChoiceChip type="radio" name="metodo" value="tacto" label="Tacto" checked={metodo === "tacto"} onChange={() => setMetodo("tacto")} />
              <ChoiceChip type="radio" name="metodo" value="ecografia" label="Ecografía" checked={metodo === "ecografia"} onChange={() => setMetodo("ecografia")} />
            </div>
          </fieldset>
          <Field label="Veterinario" htmlFor="veterinario" optional>
            <Input id="veterinario" name="veterinario" maxLength={120} placeholder="Quién hizo el tacto" />
          </Field>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
                <th className="w-[44px] border-b border-border py-2.5 pl-5 pr-2">#</th>
                <th className="w-[190px] border-b border-border px-2 py-2.5">Caravana</th>
                <th className="border-b border-border px-2 py-2.5">Hembra</th>
                <th className="w-[170px] border-b border-border px-2 py-2.5">Resultado</th>
                <th className="w-[110px] border-b border-border px-2 py-2.5 text-right">Días</th>
                <th className="w-[170px] border-b border-border px-2 py-2.5 text-right">Parto probable</th>
                <th className="w-[52px] border-b border-border py-2.5 pr-5" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => {
                const g = f.animal ? gestacion(gestaciones, f.animal.especie, f.animal.raza) : null;
                const dias = Number(f.dias);
                const err = state.errores?.[f.key] ?? f.err;
                const aviso = avisos[f.key];
                return (
                  <tr key={f.key} className={cx("align-top", aviso && "bg-warning-bg/50", err && "bg-danger-bg/40")}>
                    <td className="border-b border-border py-3 pl-5 pr-2 tabular-nums text-muted">{i + 1}</td>
                    <td className="border-b border-border px-2 py-2">
                      <div className="relative">
                        <input
                          ref={(el) => {
                            refs.current.set(`busca:${f.key}`, el);
                          }}
                          aria-label={`Caravana fila ${i + 1}`}
                          value={f.busca}
                          placeholder="0142"
                          onChange={(e) => set(f.key, { busca: e.target.value, animal: null, err: undefined })}
                          onBlur={() => f.busca && !f.animal && void buscar(f)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (f.animal) foco(f.key, "pv");
                              else void buscar(f);
                            }
                          }}
                          className={cx(inputClass, "h-10 tabular-nums")}
                        />
                        {f.buscando && (
                          <span className="absolute right-3 top-3">
                            <Spinner />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border-b border-border px-2 py-3">
                      {f.animal ? (
                        <span>
                          <span className="font-medium text-ink">{f.animal.categoria}</span>
                          <span className="block text-[12.5px] text-muted">{[f.animal.raza ? `gestación ${g} d` : `sin raza · ${g} d`, f.animal.estadoReproductivo ? `hoy: ${f.animal.estadoReproductivo}` : null].filter(Boolean).join(" · ")}</span>
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
                    <td className="border-b border-border px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        {(["prenada", "vacia"] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            ref={
                              r === "prenada"
                                ? (el) => {
                                    refs.current.set(`pv:${f.key}`, el);
                                  }
                                : undefined
                            }
                            aria-keyshortcuts="P V"
                            onKeyDown={(e) => {
                              const k = e.key.toLowerCase();
                              if (k === "p") {
                                e.preventDefault();
                                set(f.key, { resultado: "prenada" });
                                foco(f.key, "dias");
                              } else if (k === "v") {
                                e.preventDefault();
                                set(f.key, { resultado: "vacia", dias: "" });
                                siguiente(f);
                              }
                            }}
                            disabled={!f.animal}
                            onClick={() => {
                              set(f.key, { resultado: r, ...(r === "vacia" ? { dias: "" } : {}) });
                              if (r === "prenada") foco(f.key, "dias");
                            }}
                            className={cx(
                              "h-10 flex-1 rounded-[8px] border text-[13.5px] font-semibold transition-colors disabled:opacity-40",
                              f.resultado === r ? (r === "prenada" ? "border-monte bg-monte text-blanco" : "border-ink bg-ink text-blanco") : "border-border-strong bg-surface text-ink hover:border-campo",
                            )}
                          >
                            {r === "prenada" ? "P" : "V"}
                            <span className="sr-only">{r === "prenada" ? "reñada" : "acía"}</span>
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="border-b border-border px-2 py-2">
                      <input
                        ref={(el) => {
                          refs.current.set(`dias:${f.key}`, el);
                        }}
                        aria-label={`Días de gestación fila ${i + 1}`}
                        inputMode="numeric"
                        maxLength={3}
                        disabled={f.resultado !== "prenada"}
                        value={f.dias}
                        onChange={(e) => set(f.key, { dias: e.target.value.replace(/\D/g, "") })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (Number(f.dias) > 0) siguiente(f);
                          }
                        }}
                        className={cx(inputClass, "h-10 text-right font-semibold tabular-nums disabled:bg-base")}
                      />
                    </td>
                    <td className="border-b border-border px-2 py-3 text-right tabular-nums">
                      {f.resultado === "prenada" && dias > 0 && g ? (
                        <span className="font-semibold text-ink">{fmtFecha(fpp(fecha, dias, g))}</span>
                      ) : f.resultado === "vacia" ? (
                        <Badge tone="neutral">Vacía</Badge>
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
            <Notice tone="success" title={`${state.total} ${state.total === 1 ? "tacto guardado" : "tactos guardados"} en esta sesión.`}>
              El estado reproductivo y el calendario de partos ya están al día.
            </Notice>
          )}
          {state.error && <Notice tone="danger" title={state.error} />}
          {conAviso.length > 0 && (
            <Notice tone="warning" title={conAviso.length === 1 ? "Un tacto quedó sin guardar: revisá el aviso de la fila." : `${conAviso.length} tactos quedaron sin guardar: revisá los avisos.`}>
              Si el dato está bien, guardalo igual: queda registrado que lo confirmaste.
            </Notice>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-muted">
              {listas.length ? (
                <>
                  <span className="font-semibold tabular-nums text-ink">{listas.length}</span> {listas.length === 1 ? "hembra" : "hembras"} ·{" "}
                  <span className="font-semibold tabular-nums text-ink">{prenadas}</span> {prenadas === 1 ? "preñada" : "preñadas"}
                  {listas.length > 0 && <span> ({Math.round((prenadas / listas.length) * 100)} %)</span>}
                </>
              ) : (
                "Cargá caravana y resultado para empezar."
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {conAviso.length > 0 && (
                <Button type="submit" name="modo" value="confirmar" variant="outline" disabled={pending}>
                  Guardar igual
                </Button>
              )}
              <Button type="submit" disabled={pending || !listas.length} icon={pending ? <Spinner /> : <IconHeart size={18} />}>
                Guardar {listas.length > 1 ? `${listas.length} tactos` : "tacto"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </form>
  );
}

"use client";

import { startTransition, useRef, useState, type DragEvent, type FormEvent } from "react";
import { crearDocumentoAction } from "@/lib/documento-actions";
import { buscarAnimalAction, type AnimalElegido } from "@/lib/evento-actions";
import { uuidv7 } from "@/lib/uuid";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Spinner, cx, fieldAria } from "@/components/ui";
import { IconClose, IconFile, IconLock, IconPlus, IconUpload } from "@/components/icons";
import { PRIVACIDAD } from "@/components/panel/documentos/badges";

export type TipoDoc = { codigo: string; nombre: string; privacidad: string; venceDias: number | null; publicable: boolean };

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Subir un documento (TPA-36): archivo → tipo → datos → a qué corresponde. La categoría de
 * privacidad sale del tipo (un fiscal es siempre fiscal y nunca se publica) y el vencimiento
 * se propone con los días del tipo.
 */
export function NuevoDocumento({
  tipos,
  lotes,
  potreros,
  hoy,
  animalesIniciales,
  loteInicial,
}: {
  tipos: TipoDoc[];
  lotes: Array<{ id: string; nombre: string }>;
  potreros: Array<{ id: string; nombre: string }>;
  hoy: string;
  animalesIniciales: AnimalElegido[];
  loteInicial?: string;
}) {
  const { state, formAction, pending, f } = useActionForm(crearDocumentoAction);
  const [ids] = useState(() => ({ doc: uuidv7(), version: uuidv7() }));
  const [file, setFile] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState("");
  const [emitido, setEmitido] = useState(hoy);
  const [vence, setVence] = useState("");
  const [titulo, setTitulo] = useState("");
  const [animales, setAnimales] = useState<AnimalElegido[]>(animalesIniciales);
  const [busca, setBusca] = useState("");
  const [buscaErr, setBuscaErr] = useState("");
  const [buscando, setBuscando] = useState(false);
  const t = tipos.find((x) => x.codigo === tipo);
  const grupos = ["sanitario", "comercial", "fiscal", "general"].map((p) => ({ p, xs: tipos.filter((x) => x.privacidad === p) })).filter((g) => g.xs.length);

  function elegirTipo(c: string) {
    setTipo(c);
    const nt = tipos.find((x) => x.codigo === c);
    if (nt?.venceDias && emitido) setVence(sumarDias(emitido, nt.venceDias));
    if (!titulo && nt) setTitulo(`${nt.nombre} ${emitido.slice(0, 4)}`);
  }

  function soltar(e: DragEvent) {
    e.preventDefault();
    setArrastrando(false);
    const x = e.dataTransfer.files?.[0];
    if (x && inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(x);
      inputRef.current.files = dt.files;
      setFile(x);
    }
  }

  async function sumar() {
    if (!busca.trim()) return;
    setBuscando(true);
    setBuscaErr("");
    const r = await buscarAnimalAction(busca);
    setBuscando(false);
    if (!r.animal) return setBuscaErr(r.error ?? "No lo encontramos.");
    if (!animales.some((a) => a.id === r.animal!.id)) setAnimales((xs) => [...xs, r.animal!]);
    setBusca("");
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={enviar} noValidate className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <input type="hidden" name="doc_id" value={ids.doc} />
      <input type="hidden" name="doc_version_id" value={ids.version} />
      {animales.map((a) => (
        <input key={a.id} type="hidden" name="animal_id" value={a.id} />
      ))}
      <div className="min-w-0 space-y-4">
        <Card className="overflow-hidden">
          <CardHeader title="Archivo" description="PDF o foto, hasta 10 MB. Se calcula su huella: si alguien lo cambia, deja de coincidir." />
          <div className="px-5 py-5">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={soltar}
              className={cx(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed px-6 py-8 text-center transition-colors",
                f.archivo ? "border-danger bg-danger-bg" : arrastrando ? "border-campo bg-campo-50" : file ? "border-campo bg-campo-50" : "border-border-strong bg-base hover:border-campo",
              )}
            >
              <input
                ref={inputRef}
                id="archivo"
                name="archivo"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <>
                  <span className="grid h-11 w-11 place-items-center rounded-[10px] bg-surface text-monte">
                    <IconFile size={22} />
                  </span>
                  <span className="text-[15px] font-semibold text-ink">{file.name}</span>
                  <span className="text-[12.5px] text-muted">
                    {kb(file.size)} · tocá para cambiarlo
                  </span>
                </>
              ) : (
                <>
                  <span className="grid h-11 w-11 place-items-center rounded-[10px] bg-surface text-campo">
                    <IconUpload size={22} />
                  </span>
                  <span className="text-[15px] font-semibold text-ink">Elegí el archivo o arrastralo acá</span>
                  <span className="text-[12.5px] text-muted">PDF, JPG, PNG o WebP</span>
                </>
              )}
            </label>
            {f.archivo && <p className="mt-2 text-[12.5px] font-medium text-danger">{f.archivo}</p>}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Qué es" />
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Tipo de documento" htmlFor="tipo" error={f.tipo}>
                <Select id="tipo" name="tipo" value={tipo} onChange={(e) => elegirTipo(e.target.value)} {...fieldAria("tipo", f.tipo)}>
                  <option value="">Elegí</option>
                  {grupos.map((g) => (
                    <optgroup key={g.p} label={PRIVACIDAD[g.p]}>
                      {g.xs.map((x) => (
                        <option key={x.codigo} value={x.codigo}>
                          {x.nombre}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Título" htmlFor="titulo" error={f.titulo} hint="Cómo lo vas a buscar después. Ej.: «Acta aftosa 1.ª campaña 2026».">
                <Input id="titulo" name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} {...fieldAria("titulo", f.titulo, true)} />
              </Field>
            </div>
            <Field label="Emitido por" htmlFor="emisor" optional hint="Declarado: TROPILLA no lo verifica.">
              <Input id="emisor" name="emisor" maxLength={200} placeholder="Ej. FUCOSA, Dr. Pérez, SENASA" />
            </Field>
            <Field label="Fecha de emisión" htmlFor="emitido_en" error={f.emitido_en} optional>
              <Input
                id="emitido_en"
                name="emitido_en"
                type="date"
                value={emitido}
                max={hoy}
                onChange={(e) => {
                  setEmitido(e.target.value);
                  if (t?.venceDias && e.target.value) setVence(sumarDias(e.target.value, t.venceDias));
                }}
                {...fieldAria("emitido_en", f.emitido_en)}
              />
            </Field>
            <Field label="Vencimiento" htmlFor="vence_en" error={f.vence_en} optional hint={t?.venceDias ? `Propuesto: ${t.venceDias} días desde la emisión.` : "Te avisamos a los 30, 7 y 0 días."}>
              <Input id="vence_en" name="vence_en" type="date" value={vence} onChange={(e) => setVence(e.target.value)} {...fieldAria("vence_en", f.vence_en, true)} />
            </Field>
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink">Categoría</p>
              <input type="hidden" name="privacidad" value={t?.privacidad ?? ""} />
              {t ? (
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone={t.privacidad === "fiscal" ? "warning" : "neutral"} icon={<IconLock size={14} />}>
                    {PRIVACIDAD[t.privacidad] ?? t.privacidad}
                  </Badge>
                  <span className="text-[12.5px] text-muted">{t.publicable ? "Privado; podés mostrarlo en el perfil." : "Privado siempre: nunca se publica."}</span>
                </span>
              ) : (
                <span className="text-[13px] text-subtle">Sale del tipo</span>
              )}
              {f.privacidad && <p className="mt-1 text-[12.5px] font-medium text-danger">{f.privacidad}</p>}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="A qué corresponde" description="Opcional. Si no elegís nada, queda en la carpeta del establecimiento." />
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
            <Field label="Lote" htmlFor="lote_id" optional>
              <Select id="lote_id" name="lote_id" defaultValue={loteInicial ?? ""}>
                <option value="">Ninguno</option>
                {lotes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Potrero" htmlFor="potrero_id" optional>
              <Select id="potrero_id" name="potrero_id" defaultValue="">
                <option value="">Ninguno</option>
                {potreros.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Animales" htmlFor="busca_animal" optional error={buscaErr || f.animales}>
                <div className="flex gap-2">
                  <Input
                    id="busca_animal"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void sumar();
                      }
                    }}
                    placeholder="Caravana, RFID o tatuaje y Enter"
                  />
                  <Button type="button" variant="outline" onClick={() => void sumar()} disabled={buscando} icon={buscando ? <Spinner /> : <IconPlus size={16} />}>
                    Sumar
                  </Button>
                </div>
              </Field>
              {animales.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {animales.map((a) => (
                    <li key={a.id} className="inline-flex items-center gap-2 rounded-[8px] border border-border bg-base py-1 pl-3 pr-1 text-[13.5px]">
                      <span className="font-semibold tabular-nums text-ink">{a.ident}</span>
                      <span className="text-muted">{a.categoria}</span>
                      <button type="button" aria-label={`Quitar ${a.ident}`} onClick={() => setAnimales((xs) => xs.filter((x) => x.id !== a.id))} className="grid h-7 w-7 place-items-center rounded-[6px] text-muted hover:bg-surface hover:text-ink">
                        <IconClose size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>

      <aside className="space-y-3 xl:sticky xl:top-6">
        <Card className="overflow-hidden">
          <CardHeader title="Se va a guardar" />
          <dl className="divide-y divide-border text-[14px]">
            {[
              ["Archivo", file ? file.name : "—"],
              ["Tipo", t?.nombre ?? "—"],
              ["Vence", vence ? vence.split("-").reverse().join("/") : "Sin vencimiento"],
              ["Vínculos", animales.length ? `${animales.length} ${animales.length === 1 ? "animal" : "animales"}` : "Establecimiento"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 px-5 py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="max-w-[60%] truncate text-right font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="space-y-3 border-t border-border px-5 py-4">
            <FormAlerts state={state} pending={pending} />
            <Button type="submit" className="w-full" disabled={pending} icon={pending ? <Spinner /> : <IconUpload size={18} />}>
              {pending ? "Subiendo…" : "Guardar documento"}
            </Button>
            <p className="text-[12.5px] leading-snug text-muted">Queda como versión 1 con su huella. Si después cambia, se sube una versión nueva: nada se pisa.</p>
          </div>
        </Card>
      </aside>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { guardarLoteAction } from "@/lib/lote-actions";
import { FormAlerts, useActionForm } from "@/components/panel/form-state";
import { ChoiceCard } from "@/components/choice";
import { ConteoInputs } from "@/components/panel/lotes/conteo";
import { Button, Card, CardHeader, Field, Input, Select, Spinner, Textarea, buttonClass, fieldAria } from "@/components/ui";
import { IconArrowLeft, IconHash, IconTag } from "@/components/icons";
import { PROPOSITOS, type CategoriaOpcion } from "@/lib/lotes";
import { uuidv7 } from "@/lib/uuid";

/**
 * Alta de un lote (TPA-20). Si es por cantidades, el conteo inicial y el
 * potrero viajan como eventos (alta + traslado) apenas se crea el lote.
 */
export function NuevoLoteForm({
  especies,
  categorias,
  potreros,
  hoy,
}: {
  especies: Array<"BOV" | "BUB">;
  categorias: Record<"BOV" | "BUB", CategoriaOpcion[]>;
  potreros: Array<{ id: string; nombre: string }>;
  hoy: string;
}) {
  const { state, formAction, pending, f, idem } = useActionForm(guardarLoteAction);
  const [especie, setEspecie] = useState<"BOV" | "BUB">(especies[0] ?? "BOV");
  const [anonimo, setAnonimo] = useState(true);
  const [ids] = useState(() => ({ alta: uuidv7(), traslado: uuidv7() }));

  return (
    <form action={formAction} noValidate className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <input type="hidden" name="idem" value={idem} />
      <input type="hidden" name="idem_alta" value={ids.alta} />
      <input type="hidden" name="idem_traslado" value={ids.traslado} />

      <Card className="self-start overflow-hidden">
        <CardHeader title="Datos del lote" description="La especie no se cambia después: un lote no mezcla bovinos y bubalinos." />
        <div className="space-y-5 px-5 py-5">
          <FormAlerts state={state} pending={pending} />
          <Field label="Nombre" htmlFor="nombre" error={f.nombre}>
            <Input id="nombre" name="nombre" maxLength={80} placeholder="Vientres Murrah" autoFocus {...fieldAria("nombre", f.nombre)} />
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink">Especie</legend>
            <div className="grid grid-cols-2 gap-3">
              {(["BOV", "BUB"] as const).map((e) => (
                <ChoiceCard
                  key={e}
                  name="especie"
                  value={e}
                  checked={especie === e}
                  onChange={() => setEspecie(e)}
                  disabled={!especies.includes(e)}
                  title={e === "BOV" ? "Bovinos" : "Bubalinos"}
                  description={especies.includes(e) ? undefined : "No declarada en el establecimiento"}
                />
              ))}
            </div>
            {f.especie && <p className="mt-1.5 text-[12.5px] font-medium text-danger">{f.especie}</p>}
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Propósito" htmlFor="proposito" optional error={f.proposito}>
              <Select id="proposito" name="proposito" defaultValue="">
                <option value="">Sin definir</option>
                {PROPOSITOS.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Potrero" htmlFor="potrero_id" optional hint={potreros.length ? undefined : "Todavía no cargaste potreros."}>
              <Select id="potrero_id" name="potrero_id" defaultValue="">
                <option value="">Sin potrero por ahora</option>
                {potreros.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink">¿Cómo llevás esta hacienda?</legend>
            <input type="hidden" name="anonimo" value={anonimo ? "1" : "0"} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ChoiceCard
                name="tipo_lote"
                checked={anonimo}
                onChange={() => setAnonimo(true)}
                icon={<IconHash size={20} />}
                title="Por cantidades"
                description="Sin caravanear todo: cargás cuántas cabezas hay por categoría."
              />
              <ChoiceCard
                name="tipo_lote"
                checked={!anonimo}
                onChange={() => setAnonimo(false)}
                icon={<IconTag size={20} />}
                title="Animales identificados"
                description="Cada animal con su caravana; los sumás desde Hacienda con «Cambiar de lote»."
              />
            </div>
          </fieldset>

          <Field label="Notas" htmlFor="notas" optional>
            <Textarea id="notas" name="notas" rows={2} className="min-h-[72px]" placeholder="Ej. vientres de 2.º servicio, entoradas con toros Murrah." />
          </Field>
        </div>
      </Card>

      <Card className="self-start overflow-hidden">
        <CardHeader
          title={anonimo ? "Conteo inicial" : "Hacienda del lote"}
          description={anonimo ? "Queda como alta de existencia en la historia del lote." : "Los animales identificados se suman después."}
        />
        <div className="space-y-5 px-5 py-5">
          {anonimo ? (
            <>
              <ConteoInputs key={especie} legend="Cabezas por categoría" categorias={categorias[especie]} error={f.conteo} />
              <Field label="Fecha del conteo" htmlFor="ocurrido_en" error={f.ocurrido_en}>
                <Input id="ocurrido_en" name="ocurrido_en" type="date" defaultValue={hoy} max={hoy} {...fieldAria("ocurrido_en", f.ocurrido_en)} />
              </Field>
            </>
          ) : (
            <>
              <p className="text-[14px] leading-relaxed text-muted">
                Creá el lote vacío y después, en <span className="font-medium text-ink">Hacienda → Animales</span>, elegí los animales y tocá{" "}
                <span className="font-medium text-ink">Cambiar de lote</span>. Si elegiste potrero, el lote queda ubicado desde hoy.
              </p>
              <input type="hidden" name="ocurrido_en" value={hoy} />
            </>
          )}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-base px-5 py-3">
          <Link href="/hacienda/lotes" className={buttonClass("ghost", "md")}>
            <IconArrowLeft size={16} /> Volver
          </Link>
          <Button type="submit" disabled={pending} icon={pending ? <Spinner /> : undefined}>
            Crear lote
          </Button>
        </footer>
      </Card>
    </form>
  );
}

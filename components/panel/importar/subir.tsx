"use client";

import { startTransition, useActionState, useRef, useState, type DragEvent } from "react";
import { subirPlanillaAction, type SubidaState } from "@/lib/importacion-actions";
import { COLUMNAS, leerCsv } from "@/lib/planilla";
import { IconAlert, IconCheckCircle, IconClose, IconFile, IconUpload } from "@/components/icons";
import { Button, Field, Notice, Select, Spinner, cx } from "@/components/ui";

/** Clave de localStorage con las filas crudas del último CSV subido (ver RevisionImportacion). */
export const CRUDAS_PENDIENTES = "tropilla_imp_crudas";

const MAX_BYTES = 10 * 1024 * 1024;
const OBLIGATORIAS = ["sexo", "categoria"] as const;

interface Leida {
  filas: number;
  faltan: string[];
  sinEspecie: boolean;
}

function peso(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/**
 * Subida de la planilla: arrastrar o elegir, chequeo rápido en el navegador
 * (extensión, peso, columnas) y envío por Server Action (el token nunca llega
 * al cliente). Si es CSV, guarda lo que escribió el productor para mostrarlo al
 * corregir: la API sólo devuelve los valores que pudo interpretar.
 */
export function SubirPlanilla({ especies }: { especies: Array<"BOV" | "BUB"> }) {
  const [state, action, pending] = useActionState<SubidaState, FormData>(subirPlanillaAction, {});
  const [archivo, setArchivo] = useState<File | null>(null);
  const [leida, setLeida] = useState<Leida | null>(null);
  const [local, setLocal] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [especie, setEspecie] = useState(especies.length === 1 ? especies[0] : "");
  const input = useRef<HTMLInputElement>(null);
  const crudas = useRef<string | null>(null);

  async function elegir(f: File | null | undefined) {
    setLeida(null);
    setLocal(null);
    crudas.current = null;
    if (!f) return setArchivo(null);
    const ext = f.name.toLowerCase().split(".").pop();
    if (ext !== "csv" && ext !== "xlsx") {
      setArchivo(null);
      return setLocal(ext === "xls" ? "Los .xls viejos no se leen: abrilo en Excel y guardalo como «Libro de Excel (.xlsx)»." : "Elegí un archivo .csv o .xlsx.");
    }
    if (f.size > MAX_BYTES) {
      setArchivo(null);
      return setLocal("La planilla pesa más de 10 MB. Dividila en dos archivos.");
    }
    setArchivo(f);
    if (ext === "csv") {
      const filas = leerCsv(await f.text());
      const cols = new Set(filas.flatMap((r) => Object.keys(r)));
      setLeida({
        filas: filas.length,
        faltan: OBLIGATORIAS.filter((c) => !cols.has(c)),
        sinEspecie: !cols.has("especie"),
      });
      crudas.current = JSON.stringify({ nombre: f.name, t: Date.now(), filas });
    }
  }

  function soltar(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setArrastrando(false);
    const f = e.dataTransfer.files?.[0];
    if (f && input.current) {
      const dt = new DataTransfer();
      dt.items.add(f);
      input.current.files = dt.files;
    }
    void elegir(f);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!archivo) return setLocal("Elegí la planilla que completaste.");
    if (leida?.sinEspecie && !especie) return setLocal("La planilla no tiene columna «especie»: elegí de qué especie es la hacienda.");
    try {
      if (crudas.current) localStorage.setItem(CRUDAS_PENDIENTES, crudas.current);
      else localStorage.removeItem(CRUDAS_PENDIENTES);
    } catch {
      /* sin localStorage: la corrección igual funciona, sin mostrar lo escrito */
    }
    const fd = new FormData();
    fd.set("archivo", archivo);
    if (especie) fd.set("especie_default", especie);
    startTransition(() => action(fd));
  }

  const error = local ?? state.error;

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <label
        htmlFor="archivo"
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={soltar}
        className={cx(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed px-6 py-9 text-center transition-colors",
          arrastrando ? "border-campo bg-campo-50" : "border-border-strong bg-base hover:border-campo",
        )}
      >
        <span className="grid h-11 w-11 place-items-center rounded-[10px] border border-border bg-surface text-monte">
          <IconUpload size={22} />
        </span>
        <span className="text-[15px] font-semibold text-ink">Arrastrá la planilla acá o tocá para elegirla</span>
        <span className="text-[13px] text-muted">CSV o Excel (.xlsx), hasta 10 MB</span>
        <input
          ref={input}
          id="archivo"
          name="archivo"
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => void elegir(e.target.files?.[0])}
        />
      </label>

      {archivo && (
        <div className="flex items-center gap-3 rounded-[10px] border border-border px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-campo-50 text-monte">
            <IconFile size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{archivo.name}</p>
            <p className="text-[12.5px] text-muted">
              {peso(archivo.size)}
              {leida && (
                <>
                  {" · "}
                  <span className="tabular-nums">{leida.filas}</span> {leida.filas === 1 ? "fila" : "filas"} con datos
                </>
              )}
              {!leida && " · Excel: lo revisamos al subirlo"}
            </p>
          </div>
          {leida && leida.faltan.length === 0 && leida.filas > 0 && <IconCheckCircle size={18} className="shrink-0 text-success" aria-label="Columnas reconocidas" />}
          <button
            type="button"
            onClick={() => {
              if (input.current) input.current.value = "";
              void elegir(null);
            }}
            aria-label="Quitar archivo"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-muted hover:bg-surface-2"
          >
            <IconClose size={16} />
          </button>
        </div>
      )}

      {leida && leida.filas === 0 && <Notice tone="warning" title="La planilla no tiene filas con datos">Completá una fila por animal debajo de los encabezados.</Notice>}
      {leida && leida.faltan.length > 0 && (
        <Notice tone="warning" title={`No encontramos ${leida.faltan.length === 1 ? "la columna" : "las columnas"} ${leida.faltan.map((c) => `«${c}»`).join(" y ")}`}>
          Revisá que la primera fila tenga los encabezados de la plantilla ({COLUMNAS.slice(0, 4).join(", ")}…). Igual podés subirla: te vamos a marcar qué falta en cada fila.
        </Notice>
      )}

      {especies.length > 1 || leida?.sinEspecie ? (
        <Field
          label="Especie si la fila no la indica"
          htmlFor="especie_default"
          optional={!leida?.sinEspecie}
          hint="Se usa sólo en las filas con la columna «especie» vacía."
        >
          <Select id="especie_default" value={especie} onChange={(e) => setEspecie(e.target.value as "BOV" | "BUB" | "")}>
            <option value="">Siempre la indica la planilla</option>
            <option value="BUB">Bubalinos</option>
            <option value="BOV">Bovinos</option>
          </Select>
        </Field>
      ) : null}

      {error && (
        <p role="alert" className="flex items-start gap-2 text-[13.5px] font-medium text-danger">
          <IconAlert size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !archivo} icon={pending ? <Spinner /> : <IconUpload size={18} />}>
          {pending ? "Subiendo…" : "Subir y revisar"}
        </Button>
        <span className="text-[12.5px] text-muted">Todavía no se carga nada: primero ves cada fila y sus errores.</span>
      </div>
    </form>
  );
}

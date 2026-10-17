"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { verificarArchivoAction, type FileVerifyResult } from "@/lib/verify-actions";
import { IconAlert, IconCheckCircle, IconUpload } from "@/components/icons";
import { Notice, Spinner, buttonClass, cx } from "@/components/ui";
import type { Locale } from "@/lib/i18n";
import { verificationPath } from "@/lib/verification-url";

type Dict = {
  fileTitle: string;
  fileLead: string;
  fileCta: string;
  fileDrop: string;
  computing: string;
  checking: string;
  match: string;
  noMatch: string;
  noMatchBody: string;
  seeRecord: string;
  another: string;
  demo: string;
  error: string;
  fingerprint: string;
};

async function sha256(file: File): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** «Verificar un archivo» (flujo 14): huella calculada con WebCrypto; el archivo no se sube. */
export function FileVerify({ locale, t }: { locale: Locale; t: Dict }) {
  const input = useRef<HTMLInputElement>(null);
  const [fase, setFase] = useState<"idle" | "hash" | "check">("idle");
  const [hash, setHash] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [res, setRes] = useState<FileVerifyResult | null>(null);
  const [drag, setDrag] = useState(false);
  const [, startTransition] = useTransition();

  async function procesar(file: File) {
    setRes(null);
    setNombre(file.name);
    setFase("hash");
    const h = await sha256(file);
    setHash(h);
    setFase("check");
    startTransition(async () => {
      setRes(await verificarArchivoAction(h, locale));
      setFase("idle");
    });
  }

  function reset() {
    setRes(null);
    setHash(null);
    setNombre(null);
    if (input.current) input.current.value = "";
  }

  const doc = res?.ok ? res.data.documento : null;

  return (
    <section aria-labelledby="verificar-archivo" className="rounded-[var(--radius-card)] border border-border bg-surface">
      <header className="border-b border-border px-5 py-4">
        <h2 id="verificar-archivo" className="text-[17px] font-semibold text-ink">
          {t.fileTitle}
        </h2>
        <p className="mt-0.5 text-[14px] text-muted">{t.fileLead}</p>
      </header>
      <div className="p-5">
        {!res && (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files[0];
              if (f) void procesar(f);
            }}
            className={cx(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed px-6 py-8 text-center transition-colors",
              drag ? "border-campo bg-campo-50" : "border-border-strong bg-base hover:border-campo",
            )}
          >
            <input
              ref={input}
              type="file"
              className="sr-only"
              accept="application/pdf,image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void procesar(f);
              }}
            />
            {fase === "idle" ? (
              <>
                <IconUpload size={26} className="text-campo" />
                <span className={buttonClass("outline", "sm")}>{t.fileCta}</span>
                <span className="text-[13px] text-muted">{t.fileDrop}</span>
              </>
            ) : (
              <span className="flex items-center gap-2 text-[14px] text-ink" role="status">
                <Spinner /> {fase === "hash" ? t.computing : t.checking}
              </span>
            )}
          </label>
        )}

        {res?.ok && (
          <div className="space-y-4" role="status">
            {res.data.coincide ? (
              <div className="flex gap-3 rounded-[12px] border border-success-border bg-success-bg p-4">
                <IconCheckCircle size={24} className="shrink-0 text-success" />
                <div>
                  <p className="text-[16px] font-semibold text-success">{t.match}</p>
                  {doc && <p className="mt-0.5 text-[14px] text-ink">{res.data.mensaje ?? doc.titulo}</p>}
                  {doc?.verificacion_url && (
                    <Link href={verificationPath(doc.verificacion_url, locale)} className="mt-2 inline-block text-[14px] font-medium text-campo hover:underline">
                      {t.seeRecord}
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-3 rounded-[12px] border border-warning-border bg-warning-bg p-4">
                <IconAlert size={24} className="shrink-0 text-warning" />
                <div>
                  <p className="text-[16px] font-semibold text-warning">{t.noMatch}</p>
                  <p className="mt-0.5 text-[14px] text-ink">{res.data.mensaje ?? t.noMatchBody}</p>
                </div>
              </div>
            )}
            {res.demo && <Notice tone="warning" title={t.demo} />}
            <dl className="text-[12.5px] text-muted">
              <dt>{nombre}</dt>
              <dd className="break-all font-mono">
                {t.fingerprint}: {hash}
              </dd>
            </dl>
            <button type="button" onClick={reset} className="text-[14px] font-medium text-campo hover:underline">
              {t.another}
            </button>
          </div>
        )}
        {res && !res.ok && (
          <div className="mt-4 space-y-3">
            <Notice tone="danger" title={t.error} />
            <button type="button" onClick={reset} className="text-[14px] font-medium text-campo hover:underline">
              {t.another}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

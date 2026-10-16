"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "@/components/ui";

/** Refresca la página server-side cada `ms` mientras la API procesa en cola (202 + polling). */
export function AutoRefresh({ ms = 1500, max = 40 }: { ms?: number; max?: number }) {
  const router = useRouter();
  const [vueltas, setVueltas] = useState(0);
  useEffect(() => {
    if (vueltas >= max) return;
    const t = setTimeout(() => {
      router.refresh();
      setVueltas((v) => v + 1);
    }, ms);
    return () => clearTimeout(t);
  }, [vueltas, max, ms, router]);
  if (vueltas < max) return null;
  return (
    <div className="mt-4">
      <Notice tone="warning" title="Está tardando más de lo normal">
        La revisión sigue en curso en TROPILLA. Recargá la página en un rato; no hace falta volver a subir la planilla.
      </Notice>
    </div>
  );
}

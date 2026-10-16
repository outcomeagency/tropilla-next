"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const KEY = "tropilla:hacienda:filtros";

/**
 * Filtros persistentes (TPA-18): al volver a /hacienda sin filtros se
 * restauran los últimos usados. Es sólo una comodidad local del navegador.
 */
export function PersistFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    try {
      if (params.has("limpiar")) {
        localStorage.removeItem(KEY);
        router.replace(pathname);
        return;
      }
      const qs = new URLSearchParams(params);
      qs.delete("cursor");
      const actual = qs.toString();
      if (actual) localStorage.setItem(KEY, actual);
      else {
        const guardado = localStorage.getItem(KEY);
        if (guardado) router.replace(`${pathname}?${guardado}`);
      }
    } catch {
      // Sin almacenamiento local: los filtros siguen funcionando por URL.
    }
  }, [params, pathname, router]);
  return null;
}

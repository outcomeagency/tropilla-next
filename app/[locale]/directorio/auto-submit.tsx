"use client";

import { useEffect, useRef } from "react";

/** Envía el formulario de filtros al cambiar un select o checkbox (sin JS, queda el botón Aplicar). */
export function AutoSubmit() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const onChange = (e: Event) => {
      const el = e.target as HTMLElement;
      if (el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && el.type === "checkbox")) form.requestSubmit();
    };
    form.addEventListener("change", onChange);
    form.dataset.auto = "1";
    return () => form.removeEventListener("change", onChange);
  }, []);
  return <span ref={ref} hidden />;
}

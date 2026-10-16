import "server-only";
import { cache } from "react";
import { api } from "@/lib/api";
import { withMock } from "@/lib/mock/fallback";
import { mockEstablecimientos } from "@/lib/mock/establecimientos";
import type { Many, One, S } from "@/lib/schemas";

/** Mis establecimientos con rol (selector, TPA-12). Una vez por request. */
export const getMisEstablecimientos = cache(() =>
  withMock(async () => (await api<Many<S<"Establecimiento">>>("/establecimientos")).data, mockEstablecimientos),
);

export type Establecimiento = S<"Establecimiento">;

/** Ficha del establecimiento (TPA-13). RENSPA y ubicación llegan null sin `establecimiento.ver_privados`. */
export function getEstablecimiento(id: string) {
  return api<One<Establecimiento>>(`/establecimientos/${id}`).then((r) => r.data);
}

export function getProductor(id: string) {
  return api<One<S<"Productor">>>(`/productores/${id}`).then((r) => r.data);
}

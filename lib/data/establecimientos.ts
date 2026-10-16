import "server-only";
import { cache } from "react";
import { api } from "@/lib/api";
import { withMock } from "@/lib/mock/fallback";
import { mockEstablecimientos } from "@/lib/mock/establecimientos";
import type { Many, S } from "@/lib/schemas";

/** Mis establecimientos con rol (selector, TPA-12). Una vez por request. */
export const getMisEstablecimientos = cache(() =>
  withMock(async () => (await api<Many<S<"Establecimiento">>>("/establecimientos")).data, mockEstablecimientos),
);

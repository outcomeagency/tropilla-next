"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { getSesionOpcional } from "@/lib/auth";
import type { Many, One, S } from "@/lib/schemas";

function input(fd: FormData): S<"BuscoInput"> {
  const provincias = String(fd.get("provincias") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  return {
    especie: fd.get("especie") === "BUB" ? "BUB" : "BOV",
    categorias: String(fd.get("categorias") ?? "").split(",").map((v) => v.trim()).filter(Boolean),
    razas: String(fd.get("razas") ?? "").split(",").map((v) => v.trim()).filter(Boolean),
    cantidad: Number(fd.get("cantidad")),
    peso_objetivo_kg: String(fd.get("peso_objetivo_kg") ?? "") || null,
    zona: fd.get("cualquier_zona") === "on" ? { cualquiera: true } : { cualquiera: false, provincias },
    plazo_hasta: String(fd.get("plazo_hasta") ?? "") || null,
    mensaje: String(fd.get("mensaje") ?? "") || null,
    mostrar_nombre: fd.get("mostrar_nombre") === "on",
  };
}

async function requireComprador() {
  const me = await getSesionOpcional();
  if (!me) throw new Error("Iniciá sesión para gestionar tus demandas.");
  return me;
}

export async function crearBuscoAction(fd: FormData) {
  await requireComprador();
  await api<One<S<"Busco">>>("/comprador/buscos", { method: "POST", body: input(fd) });
  revalidatePath("/comprador/buscos");
}

export async function editarBuscoAction(fd: FormData) {
  await requireComprador();
  await api<One<S<"Busco">>>(`/comprador/buscos/${String(fd.get("busco_id"))}`, { method: "PATCH", body: input(fd) });
  revalidatePath("/comprador/buscos");
}

export async function cerrarBuscoAction(fd: FormData) {
  await requireComprador();
  await api<One<S<"Busco">>>(`/comprador/buscos/${String(fd.get("busco_id"))}/cerrar`, { method: "POST" });
  revalidatePath("/comprador/buscos");
}

export async function getBuscos() {
  await requireComprador();
  return (await api<Many<S<"Busco">>>("/comprador/buscos?limit=100")).data;
}

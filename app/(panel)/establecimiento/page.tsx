import type { Metadata } from "next";
import { IconMap } from "@/components/icons";
import { ModulePlaceholder } from "@/components/panel/module-placeholder";

export const metadata: Metadata = { title: "Mi establecimiento" };

export default function EstablecimientoPage() {
  return (
    <ModulePlaceholder
      title="Mi establecimiento"
      subtitle="Datos del campo, potreros, responsables e instalaciones."
      icon={<IconMap size={24} />}
      emptyTitle="Cargá los potreros de La Esperanza"
      emptyDescription="Definí cada potrero con su tipo de ambiente (bañado, loma, malezal) y si tiene revolcadero, como «Bañado Norte» o «Loma del Monte». Así los movimientos y la ubicación de cada lote quedan ordenados."
      actions={[{ label: "Agregar potrero", variant: "primary" }, { label: "Editar datos del establecimiento", variant: "outline" }]}
      scope={[
        "Datos del productor y del establecimiento: 2.400 ha en General Paz, Corrientes",
        "Potreros con ambiente, superficie y pastura",
        "Responsables e instalaciones (manga, balanza, corrales)",
        "CUIT, RENSPA y ubicación exacta privados por defecto",
      ]}
    />
  );
}

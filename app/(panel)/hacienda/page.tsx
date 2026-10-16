import type { Metadata } from "next";
import { IconCow } from "@/components/icons";
import { ModulePlaceholder } from "@/components/panel/module-placeholder";

export const metadata: Metadata = { title: "Hacienda" };

export default function HaciendaPage() {
  return (
    <ModulePlaceholder
      title="Hacienda"
      subtitle="Animales, lotes, categorías, pesajes y movimientos de La Esperanza."
      icon={<IconCow size={24} />}
      emptyTitle="Todavía no hay animales cargados"
      emptyDescription="Empezá por el stock inicial: subí tu planilla (te mostramos los errores fila por fila antes de importar) o cargá un lote por cantidades, por ejemplo «380 búfalos en estas categorías». Después identificás cada animal en la manga, con o sin señal."
      actions={[{ label: "Subir planilla", variant: "primary" }, { label: "Cargar por cantidades", variant: "outline" }]}
      scope={[
        "Ficha de cada animal con caravana, tatuaje y RFID, chips de especie, raza y categoría",
        "Lotes y movimientos entre potreros con autor y fecha",
        "Pesajes con ganancia diaria y recategorización sugerida según peso y edad",
        "Bovinos y bubalinos en el mismo establecimiento, con categorías propias de cada especie",
      ]}
    />
  );
}

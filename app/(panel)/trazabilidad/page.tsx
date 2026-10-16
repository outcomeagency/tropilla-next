import type { Metadata } from "next";
import { IconRoute } from "@/components/icons";
import { ModulePlaceholder } from "@/components/panel/module-placeholder";

export const metadata: Metadata = { title: "Trazabilidad" };

export default function TrazabilidadPage() {
  return (
    <ModulePlaceholder
      title="Trazabilidad"
      subtitle="Historial de eventos del establecimiento y sus evidencias."
      icon={<IconRoute size={24} />}
      emptyTitle="Todavía no hay eventos registrados"
      emptyDescription="Cada carga (vacunación, pesaje, traslado, nacimiento) queda como un evento con autor, fecha y dispositivo. Los eventos no se borran: si algo estuvo mal, se corrige con una versión nueva y el motivo, y la anterior queda a la vista."
      actions={[{ label: "Cargar evento", variant: "primary" }]}
      scope={[
        "Línea de tiempo por animal, lote o establecimiento",
        "«Ver cambios» en cada evento corregido",
        "Estado de cada registro: guardado en el teléfono, sincronizado o anclado",
        "Anclaje diario como evidencia de integridad (no certifica el contenido)",
      ]}
    />
  );
}

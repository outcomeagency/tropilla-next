import type { Metadata } from "next";
import { IconChart } from "@/components/icons";
import { ModulePlaceholder } from "@/components/panel/module-placeholder";

export const metadata: Metadata = { title: "Comercialización" };

export default function ComercializacionPage() {
  return (
    <ModulePlaceholder
      title="Comercialización"
      subtitle="Lotes en venta, consultas de compradores y registro de tratos."
      icon={<IconChart size={24} />}
      emptyTitle="No tenés lotes publicados ni consultas"
      emptyDescription="Desde un lote armás la oferta con los datos que ya cargaste (especie, categoría, cantidad, peso con fecha de balanza, sanidad) y elegís qué mostrar. Antes de publicar te avisamos si hay retiro vigente, documentos vencidos o un pesaje viejo."
      actions={[{ label: "Publicar un lote", variant: "primary" }, { label: "Simular una venta", variant: "outline" }]}
      scope={[
        "Simulador en pie vs. al gancho con desbaste, rendimiento, comisión y flete",
        "Bandeja de consultas de compradores del portal y WhatsApp",
        "Ficha del lote para compartir por link, QR o PDF",
        "Precios siempre privados salvo que decidas mostrarlos",
      ]}
    />
  );
}

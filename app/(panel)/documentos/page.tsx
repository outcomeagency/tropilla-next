import type { Metadata } from "next";
import { IconFile } from "@/components/icons";
import { ModulePlaceholder } from "@/components/panel/module-placeholder";

export const metadata: Metadata = { title: "Documentos" };

export default function DocumentosPage() {
  return (
    <ModulePlaceholder
      title="Documentos"
      subtitle="Certificados, constancias, guías y comprobantes con su historial."
      icon={<IconFile size={24} />}
      emptyTitle="Tu carpeta de documentos está vacía"
      emptyDescription="Sacale una foto al certificado en el campo o subí el PDF: elegís el tipo, la fecha de vencimiento y el lote al que corresponde. Cada versión queda guardada con su huella; nada se pisa ni se borra."
      actions={[{ label: "Subir documento", variant: "primary" }, { label: "Ver vencimientos", variant: "outline" }]}
      scope={[
        "Carpeta con filtros por tipo, lote y vencimiento",
        "Versiones con motivo de cada corrección",
        "Nivel de confianza visible: Declarado o Integridad registrada",
        "Compartir por enlace que vence",
      ]}
    />
  );
}

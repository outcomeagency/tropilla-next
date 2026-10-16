import type { Metadata } from "next";
import { IconUser } from "@/components/icons";
import { ModulePlaceholder } from "@/components/panel/module-placeholder";

export const metadata: Metadata = { title: "Perfil público" };

export default function PerfilPublicoPage() {
  return (
    <ModulePlaceholder
      title="Perfil público"
      subtitle="Lo que ven los compradores de tu establecimiento, en español, inglés y portugués."
      icon={<IconUser size={24} />}
      emptyTitle="Tu perfil público todavía no está publicado"
      emptyDescription="Elegí qué secciones mostrar (portada, actividad, rodeo en números, sanidad resumida, documentos, oferta y contacto) y revisá la vista previa «como lo ve un comprador» antes de publicar. Nada se publica sin tu acción."
      actions={[{ label: "Configurar perfil", variant: "primary" }, { label: "Vista previa", variant: "outline" }]}
      scope={[
        "Secciones a elección, con vista previa antes de publicar",
        "Cada dato con su nivel de confianza: Declarado o Integridad registrada",
        "Versión en español, inglés y portugués",
        "CUIT, RENSPA, precios, reactores y ubicación exacta nunca se publican solos",
      ]}
    />
  );
}

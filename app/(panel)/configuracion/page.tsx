import type { Metadata } from "next";
import { IconSettings } from "@/components/icons";
import { ModulePlaceholder } from "@/components/panel/module-placeholder";

export const metadata: Metadata = { title: "Configuración" };

export default function ConfiguracionPage() {
  return (
    <ModulePlaceholder
      title="Configuración"
      subtitle="Usuarios, roles, privacidad y permisos del establecimiento."
      icon={<IconSettings size={24} />}
      emptyTitle="Sumá a tu equipo"
      emptyDescription="Invitá a tu encargado y a tu veterinario. Cada rol ve lo que necesita: por ejemplo, el encargado carga hacienda y sanidad, pero no ve precios ni documentos fiscales."
      actions={[{ label: "Invitar usuario", variant: "primary" }, { label: "Ver permisos por rol", variant: "outline" }]}
      scope={[
        "Invitaciones por email con rol: dueño, encargado o asesor",
        "Matriz de permisos legible",
        "Preferencias de privacidad del perfil público",
        "Organizaciones a las que adherís, con consentimiento revocable",
      ]}
    />
  );
}

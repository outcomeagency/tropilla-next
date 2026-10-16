import type { Metadata } from "next";
import { IconHeart } from "@/components/icons";
import { ModulePlaceholder } from "@/components/panel/module-placeholder";

export const metadata: Metadata = { title: "Reproducción" };

export default function ReproduccionPage() {
  return (
    <ModulePlaceholder
      title="Reproducción"
      subtitle="Vientres, servicios, tactos y partos por especie."
      icon={<IconHeart size={24} />}
      emptyTitle="Sin servicios ni tactos registrados"
      emptyDescription="Cuando registres un tacto en la manga, TROPILLA calcula la fecha probable de parto según la especie y la raza (por ejemplo, 303 días de gestación en búfalas Murrah) y arma el calendario de partos."
      actions={[{ label: "Registrar tacto", variant: "primary" }, { label: "Ver calendario de partos", variant: "outline" }]}
      scope={[
        "Tablero de vientres: vacías, servidas, preñadas por mes de parto y paridas",
        "Calendario de partos probables con aviso de parto vencido",
        "Registro de parto que crea la cría vinculada a la madre",
        "Indicadores de preñez por campaña y por especie",
      ]}
    />
  );
}

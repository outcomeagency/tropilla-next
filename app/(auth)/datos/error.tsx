"use client";

import { Button, Card, EmptyState } from "@/components/ui";
import { IconAlert } from "@/components/icons";

/** Error del tablero agregado: la API no respondió o devolvió algo inesperado. */
export default function DatosError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-16">
      <Card>
        <EmptyState
          icon={<IconAlert size={22} />}
          title="No pudimos cargar los datos agregados"
          description="Puede ser un problema de conexión con TROPILLA. No se registró ninguna consulta nueva."
          action={<Button onClick={() => retry()}>Reintentar</Button>}
        />
      </Card>
    </div>
  );
}

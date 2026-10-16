"use client";

import { IconCloudOff } from "@/components/icons";
import { Button, Card, EmptyState } from "@/components/ui";

/** Error de una pantalla del panel: qué pasó y qué hago (nunca una pantalla en blanco). */
export default function PanelError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  return (
    <Card>
      <EmptyState
        icon={<IconCloudOff size={24} />}
        title="No pudimos cargar esta pantalla"
        description={
          <>
            Puede ser un problema de conexión con TROPILLA. Lo que cargaste desde el celular sigue guardado en el teléfono hasta que sincronice.
            {digest && <span className="mt-2 block text-[12.5px] text-subtle">Código para soporte: {digest}</span>}
          </>
        }
        action={<Button onClick={() => retry()}>Reintentar</Button>}
      />
    </Card>
  );
}

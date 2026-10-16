import { getContexto } from "@/lib/establecimiento";
import { MockNotice, Notice } from "@/components/ui";
import { ResendVerification } from "./resend-verification";

/**
 * Chequeos de sesión del panel (detrás de Suspense): sin establecimiento →
 * onboarding (lo hace getContexto); email sin verificar → aviso con reenvío;
 * API caída → aviso; sesión demo → aviso de datos de ejemplo.
 */
export async function SessionGate() {
  const ctx = await getContexto();
  if (!ctx) {
    return (
      <div className="mb-5">
        <Notice tone="warning" title="Sin conexión con TROPILLA">
          Lo que ves puede no estar actualizado. Probá recargar en unos minutos.
        </Notice>
      </div>
    );
  }
  const { me, source } = ctx;
  return (
    <>
      {source === "mock" && (
        <div className="mb-4">
          <MockNotice text="Sesión de demostración: la API no está disponible y se muestran datos de ejemplo." />
        </div>
      )}
      {me.usuario.email && me.usuario.email_verificado === false && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-info-border bg-info-bg px-4 py-3 text-[14px] text-info">
          <p>
            <span className="font-semibold">Verificá tu email</span> ({me.usuario.email}) para publicar tu perfil, ofertas y contratos.
          </p>
          <ResendVerification />
        </div>
      )}
    </>
  );
}

import { getCurrentUser, ROL_LABEL } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";
import { IconCloudOff, IconLogout } from "@/components/icons";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Usuario de la sesión al pie de la sidebar. Lee la cookie (dato de request),
 * por eso el layout lo renderiza dentro de <Suspense>.
 */
export async function UserCard() {
  const current = await getCurrentUser();
  const offline = current.status === "unavailable";
  const nombre = offline ? "Sin conexión" : current.me.usuario.nombre;
  const membresia = offline ? undefined : current.me.membresias[0];
  const rol = membresia ? ROL_LABEL[membresia.rol] : "Sin establecimiento";

  return (
    <div className="flex items-center gap-3 px-1">
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sidebar-active text-[13px] font-semibold text-sidebar-ink"
      >
        {initials(nombre)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold">{nombre}</p>
        {offline ? (
          <p className="flex items-center gap-1 text-[12px] text-sidebar-muted" title="No pudimos validar la sesión con la API">
            <IconCloudOff size={13} /> Sin conexión
          </p>
        ) : (
          <p className="truncate text-[12px] text-sidebar-muted">{rol}</p>
        )}
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="grid h-9 w-9 place-items-center rounded-[var(--radius-control)] text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <IconLogout size={18} />
        </button>
      </form>
    </div>
  );
}

export function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-1" aria-hidden="true">
      <span className="h-9 w-9 rounded-full bg-sidebar-hover" />
      <span className="h-3 w-28 rounded bg-sidebar-hover" />
    </div>
  );
}

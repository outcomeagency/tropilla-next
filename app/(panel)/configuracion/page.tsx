import Link from "next/link";
import type { ComponentType } from "react";
import type { Metadata } from "next";
import { Badge, Card, PageHeader } from "@/components/ui";
import { IconBuilding, IconChevronRight, IconClock, IconGlobe, IconSend, IconUser, IconUsers, type IconProps } from "@/components/icons";

export const metadata: Metadata = { title: "Configuración" };

const SECCIONES: Array<{ href?: string; titulo: string; texto: string; Icon: ComponentType<IconProps> }> = [
  { href: "/configuracion/usuarios", titulo: "Usuarios y roles", texto: "Invitá a tu encargado y a tu veterinario; cada rol ve lo que necesita.", Icon: IconUsers },
  { href: "/establecimientos", titulo: "Mis establecimientos", texto: "Los campos donde tenés acceso y tu rol en cada uno.", Icon: IconBuilding },
  { href: "/perfil-publico", titulo: "Perfil público y privacidad", texto: "Qué se muestra en el directorio y qué queda privado.", Icon: IconGlobe },
  { href: "/configuracion/telegram", titulo: "Bot de Telegram", texto: "Consultas, cargas rápidas, actas por foto y avisos desde Telegram.", Icon: IconSend },
  { titulo: "Mi cuenta", texto: "Nombre, idioma, contraseña y dispositivos con sesión.", Icon: IconUser },
  { href: "/organizaciones", titulo: "Organizaciones", texto: "Asociaciones a las que adherís, con consentimiento revocable.", Icon: IconBuilding },
];

export default function ConfiguracionPage() {
  return (
    <>
      <PageHeader title="Configuración" subtitle="Equipo, establecimientos, privacidad y cuenta." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SECCIONES.map((s) => {
          const body = (
            <Card className={s.href ? "h-full transition-shadow hover:shadow-[var(--shadow-hover)]" : "h-full"}>
              <div className="flex items-start gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-campo-50 text-monte">
                  <s.Icon size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[16px] font-semibold text-ink">
                    {s.titulo}
                    {!s.href && (
                      <Badge icon={<IconClock size={13} />}>
                        Próximamente
                      </Badge>
                    )}
                  </p>
                  <p className="mt-1 text-[14px] text-muted">{s.texto}</p>
                </div>
                {s.href && <IconChevronRight size={18} className="mt-1 shrink-0 text-subtle" />}
              </div>
            </Card>
          );
          return s.href ? (
            <Link key={s.titulo} href={s.href} className="block rounded-[var(--radius-card)]">
              {body}
            </Link>
          ) : (
            <div key={s.titulo}>{body}</div>
          );
        })}
      </div>
    </>
  );
}

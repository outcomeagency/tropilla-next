import Link from "next/link";
import { Card, CardHeader, EmptyState, Notice } from "@/components/ui";
import { IconArrowRight, IconCheckCircle } from "@/components/icons";
import { AlertaClima } from "@/components/panel/clima/alerta-clima";
import { getClima } from "@/lib/data/clima";
import { fechaHora } from "@/lib/format";

/** Tarjeta de clima del inicio (TPA-70): hasta 3 alertas vigentes, la más severa primero. */
export async function ClimaInicio({ est }: { est: string }) {
  const r = await getClima(est);
  if (r.estado === "sin_endpoint") return null;

  const verTodo = (
    <Link href="/clima" className="inline-flex items-center gap-1 text-[13px] font-medium text-campo hover:underline">
      Ver clima <IconArrowRight size={16} />
    </Link>
  );

  if (r.estado === "error") {
    return (
      <Card className="mt-4">
        <CardHeader title="Alertas climáticas" action={verTodo} />
        <div className="p-5">
          <Notice tone="warning" title="No pudimos traer el pronóstico">
            {r.mensaje} Probá de nuevo en unos minutos.
          </Notice>
        </div>
      </Card>
    );
  }

  const { clima } = r;
  const alertas = clima.alertas ?? [];
  return (
    <Card className="mt-4">
      <CardHeader
        title="Alertas climáticas"
        description={`${clima.zona} · pronóstico actualizado ${fechaHora(clima.calculado_en)}. Es pronóstico, no certeza.`}
        action={verTodo}
      />
      {alertas.length ? (
        <ul>
          {alertas.slice(0, 3).map((a) => (
            <li key={a.id} className="border-b border-border last:border-b-0">
              <AlertaClima a={a} compacta />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<IconCheckCircle size={24} />}
          title="Sin alertas climáticas por ahora"
          description="El pronóstico de los próximos días no supera los umbrales de lluvia extrema, sequía, helada, calor o incendio para tu zona. Se revisa cada 6 horas."
        />
      )}
    </Card>
  );
}

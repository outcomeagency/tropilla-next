import { seguirProductorAction } from "@/lib/comprador-actions";
import { Button, Card, CardBody } from "@/components/ui";
import { IconCheckCircle } from "@/components/icons";

export function FollowProducer({ slug, name }: { slug: string; name?: string }) {
  return <Card><CardBody className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-ink">Seguir a {name ?? "este productor"}</p><p className="mt-0.5 text-sm text-muted">Vas a recibir avisos cuando publique ofertas o contratos nuevos.</p></div><form action={seguirProductorAction}><input type="hidden" name="establecimiento_slug" value={slug} /><Button type="submit" variant="outline" icon={<IconCheckCircle size={16} />}>Seguir productor</Button></form></CardBody></Card>;
}

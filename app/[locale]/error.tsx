"use client";

import { useParams } from "next/navigation";
import { IconCloudOff } from "@/components/icons";
import { Button, Card, EmptyState } from "@/components/ui";

const T = {
  es: { title: "No pudimos cargar esta página", body: "TROPILLA no respondió a tiempo. Probá de nuevo en unos segundos.", retry: "Reintentar", code: "Código para soporte" },
  en: { title: "We couldn't load this page", body: "TROPILLA didn't respond in time. Please try again in a few seconds.", retry: "Try again", code: "Support code" },
  pt: { title: "Não conseguimos carregar esta página", body: "A TROPILLA não respondeu a tempo. Tente de novo em alguns segundos.", retry: "Tentar de novo", code: "Código para suporte" },
};

/** Error del portal público en el idioma de la ruta (la API no respondió). */
export default function PortalError({ error, retry }: { error: unknown; retry: () => void }) {
  const { locale } = useParams<{ locale: string }>();
  const t = T[locale as keyof typeof T] ?? T.es;
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  return (
    <main className="mx-auto max-w-[760px] px-4 py-16">
      <Card>
        <EmptyState
          icon={<IconCloudOff size={24} />}
          title={t.title}
          description={
            <>
              {t.body}
              {digest && <span className="mt-2 block text-[12.5px] text-subtle">{t.code}: {digest}</span>}
            </>
          }
          action={<Button onClick={() => retry()}>{t.retry}</Button>}
        />
      </Card>
    </main>
  );
}

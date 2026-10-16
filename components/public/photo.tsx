import Image from "next/image";
import { cx } from "@/components/ui";
import { IconCamera } from "@/components/icons";
import type { S } from "@/lib/schemas";

/**
 * Foto servida por la API. Las rutas públicas son inmutables y optimizables;
 * las privadas llevan firma temporal y se sirven directas para no cachearlas.
 * Sin foto: placeholder sobrio, nunca una ilustración.
 */
export function Photo({
  src: source,
  alt,
  sizes,
  className,
  preload,
}: {
  src?: string | S<"Foto"> | null;
  alt: string;
  sizes: string;
  className?: string;
  preload?: boolean;
}) {
  const src = typeof source === "string" ? source : source?.url;
  const dimensions = typeof source === "object" && source ? { width: source.ancho, height: source.alto } : null;
  if (!src) {
    return (
      <div className={cx("grid place-items-center bg-crema text-crema-300", className)} role="img" aria-label={alt}>
        <IconCamera size={28} />
      </div>
    );
  }
  const privateSigned = src.includes("/fotos/") && !src.includes("/public/fotos/");
  const altText = typeof source === "object" && source?.alt ? source.alt : alt;
  return (
    <div className={cx("relative overflow-hidden bg-crema", className)} style={dimensions?.width && dimensions.height ? { aspectRatio: `${dimensions.width}/${dimensions.height}` } : undefined}>
      <Image src={src} alt={altText} fill sizes={sizes} className="object-cover" unoptimized={privateSigned} preload={preload} quality={75} />
    </div>
  );
}

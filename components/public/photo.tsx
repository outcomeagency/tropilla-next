import Image from "next/image";
import { cx } from "@/components/ui";
import { IconCamera } from "@/components/icons";

/**
 * Foto de campo. Las de Unsplash (lib/photos.ts) pasan por el optimizador;
 * las de la API (URL prefirmada de 5 min) van sin optimizar para no cachear
 * una URL que vence. Sin foto: placeholder sobrio, nunca una ilustración.
 */
export function Photo({
  src,
  alt,
  sizes,
  className,
  preload,
}: {
  src?: string | null;
  alt: string;
  sizes: string;
  className?: string;
  preload?: boolean;
}) {
  if (!src) {
    return (
      <div className={cx("grid place-items-center bg-crema text-crema-300", className)} role="img" aria-label={alt}>
        <IconCamera size={28} />
      </div>
    );
  }
  const optimizable = src.startsWith("https://images.unsplash.com/");
  return (
    <div className={cx("relative overflow-hidden bg-crema", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" unoptimized={!optimizable} preload={preload} quality={75} />
    </div>
  );
}

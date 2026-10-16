import Image from "next/image";

/**
 * Logo de TROPILLA a partir de los PNG aprobados (brain/visual-identity/assets).
 * El lettering del logotipo es pieza de marca: no se reemplaza por texto en Montserrat.
 * - `onDark`: isotipo negativo + wordmark blanco (sidebar verde monte).
 * - por defecto: logo horizontal a color (superficies claras).
 * Pendiente: reemplazar por SVG maestros cuando estén dibujados (visual-identity §12).
 */
export function Logo({ onDark = false, height = 32 }: { onDark?: boolean; height?: number }) {
  if (onDark) {
    return (
      <span className="inline-flex items-center gap-2.5" aria-label="TROPILLA">
        <Image src="/brand/isotipo-negativo.png" alt="" width={Math.round(height * 0.9)} height={height} style={{ height, width: "auto" }} preload />
        <Image
          src="/brand/wordmark-blanco.png"
          alt="TROPILLA"
          width={Math.round(height * 0.62 * (600 / 82))}
          height={Math.round(height * 0.62)}
          preload
        />
      </span>
    );
  }
  return (
    <Image
      src="/brand/logo-horizontal.png"
      alt="TROPILLA"
      width={Math.round(height * (720 / 173))}
      height={height}
      preload
    />
  );
}

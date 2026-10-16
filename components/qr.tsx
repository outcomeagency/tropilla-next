import QRCode from "qrcode";

/**
 * QR en SVG generado en el servidor (sin imágenes externas). Usa currentColor
 * para heredar el color de texto (tokens), con fondo de la superficie.
 */
export async function Qr({ value, size = 132, label }: { value: string; size?: number; label: string }) {
  const svg = await QRCode.toString(value, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  const themed = svg
    .replace('<path fill="#ffffff"', '<path fill="transparent"')
    .replace('stroke="#000000"', 'stroke="currentColor"')
    .replace("<svg ", `<svg width="${size}" height="${size}" role="img" aria-label="${label.replace(/"/g, "&quot;")}" `);
  return <span className="inline-block text-ink" dangerouslySetInnerHTML={{ __html: themed }} />;
}

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Sólo el portal público es indexable; el panel y la cuenta no. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/es", "/en", "/pt"],
      disallow: ["/inicio", "/hacienda", "/ingresar", "/registro", "/bienvenida", "/configuracion", "/comercializacion", "/perfil-publico"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

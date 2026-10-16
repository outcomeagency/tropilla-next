import type { NextConfig } from "next";

const apiUrl = new URL(process.env.TROPILLA_API_URL ?? "http://localhost:8090/api/v1");
const publicSiteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://tropilla.ar");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // La API de desarrollo corre en loopback; la allowlist de arriba limita el destino.
    dangerouslyAllowLocalIP: apiUrl.hostname === "localhost" || apiUrl.hostname === "127.0.0.1",
    remotePatterns: [
      { protocol: apiUrl.protocol.slice(0, -1) as "http" | "https", hostname: apiUrl.hostname, ...(apiUrl.port ? { port: apiUrl.port } : {}), pathname: `${apiUrl.pathname}/**` },
      { protocol: publicSiteUrl.protocol.slice(0, -1) as "http" | "https", hostname: publicSiteUrl.hostname, ...(publicSiteUrl.port ? { port: publicSiteUrl.port } : {}), pathname: "/**" },
    ],
    qualities: [70, 75],
  },
  experimental: {
    // Hay tres root layouts ((panel), (auth) y [locale]): el 404 global no puede
    // componerse desde un layout único (ver docs: file-conventions/not-found).
    globalNotFound: true,
    // Planilla de stock (TPA-21): la Server Action reenvía hasta 10 MB a la API (+ margen multipart).
    serverActions: { bodySizeLimit: "11mb" },
    proxyClientMaxBodySize: "11mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

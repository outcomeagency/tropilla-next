import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Fotos de campo de licencia libre (lib/photos.ts) mientras no haya fotos propias.
    remotePatterns: [
      // Debe coincidir con PHOTO_QUERY de lib/photos.ts.
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-*", search: "?w=1600&q=80&fm=jpg&fit=crop" },
    ],
    qualities: [70, 75],
  },
  experimental: {
    // Hay tres root layouts ((panel), (auth) y [locale]): el 404 global no puede
    // componerse desde un layout único (ver docs: file-conventions/not-found).
    globalNotFound: true,
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
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

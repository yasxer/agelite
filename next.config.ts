import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Upload d'images produit/logo via Server Actions (5 Mo par image)
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;

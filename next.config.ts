import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Masque le badge "N" (dev tools) qui chevauche la navigation mobile
  devIndicators: false,
  images: {
    // Images produit/logo servies depuis Supabase Storage, optimisées
    // (WebP/AVIF + redimensionnement) par Next à la volée
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Upload d'images produit/logo via Server Actions (5 Mo par image)
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;

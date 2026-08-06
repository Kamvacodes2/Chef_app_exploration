import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 31536000, // 1 year — browser caches optimized images from /_next/image
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;

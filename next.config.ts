import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    if (process.env.ALMA_LEGACY_MODULES_ENABLED === "true") return [];
    return [
      "builder",
      "construction",
      "creative",
      "fitness",
      "images",
      "launch-studio",
      "presentations",
      "trader",
    ].map((route) => ({
      source: `/${route}/:path*`,
      destination: "/dashboard",
      permanent: false,
    }));
  },
};

export default nextConfig;

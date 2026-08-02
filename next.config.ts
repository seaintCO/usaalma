import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
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

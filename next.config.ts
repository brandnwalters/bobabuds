import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local Supabase Auth redirects magic links to 127.0.0.1, so the dev server
  // is used from that host as well as localhost.
  allowedDevOrigins: ["127.0.0.1"],
  // The default bottom-left indicator covers the mobile tab bar's Feed tab.
  devIndicators: { position: "top-right" },
  cacheComponents: true,
  experimental: {
    // Log form submissions carry a resized photo (up to IMAGE_MAX_BYTES, 2 MB).
    serverActions: { bodySizeLimit: "3mb" },
  },
  partialPrefetching: true,
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

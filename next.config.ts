import type { NextConfig } from "next";

// Cache Components sengaja tidak diaktifkan: semua halaman berisi data personal
// atau data admin dirender dinamis per request dan dikirim dengan no-store.
const privateHeaders = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      { source: "/admin/:path*", headers: privateHeaders },
      { source: "/admin", headers: privateHeaders },
      { source: "/hasil/:path*", headers: privateHeaders },
      { source: "/api/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;

import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // This app is self-contained in its folder (it does not share the parent project's lockfile).
  outputFileTracingRoot: path.join(__dirname),
  // Self-contained server bundle for Docker / private servers (`STANDALONE=1 npm run build`).
  output: process.env.STANDALONE === "1" ? "standalone" : undefined,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" }, // internal platform
        ],
      },
    ];
  },
  experimental: {
    // Excel uploads go through server actions (files up to 8 MB).
    serverActions: { bodySizeLimit: "9mb" },
  },
};

export default withNextIntl(nextConfig);

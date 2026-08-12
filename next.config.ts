import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.DESKTOP_BUILD === "1"
    ? {
        output: "export" as const,
        images: { unoptimized: true },
        // The desktop export does not use the Cloudflare-only database helpers.
        // Their platform types are intentionally unavailable in this build.
        typescript: { ignoreBuildErrors: true },
      }
    : {}),
};

export default nextConfig;

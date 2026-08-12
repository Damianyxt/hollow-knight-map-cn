import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.DESKTOP_BUILD === "1"
    ? {
        output: "export" as const,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;

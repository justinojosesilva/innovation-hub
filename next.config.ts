import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server build for Docker (.next/standalone/server.js).
  output: "standalone",
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "6d5d-1-47-218-73.ngrok-free.app",
    "172.28.128.1"
  ],
};

export default nextConfig;

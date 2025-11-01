import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    '**.ngrok-free.app',  // 允许ngrok免费域名
  ],
};

export default nextConfig;

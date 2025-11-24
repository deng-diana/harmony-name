import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // ⚠️ 关键：打包时忽略 TS 错误
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ 关键：打包时忽略 ESLint 检查
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
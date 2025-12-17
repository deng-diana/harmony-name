import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // ⚠️ 关键：打包时忽略 TS 错误
    ignoreBuildErrors: true,
  },
  // eslint 配置已移除，Next.js 16 不再支持在 next.config.ts 中配置 eslint
  // 如需忽略 ESLint 检查，请使用 .eslintignore 或在命令行使用 --no-lint
};

export default nextConfig;

/**
 * Next.js instrumentation —— 服务端启动时运行一次。
 * 这里做环境变量自检(Vercel 推荐在 instrumentation 里做启动级检查)。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateServerEnv } = await import("@/lib/env");
    validateServerEnv();
  }
}

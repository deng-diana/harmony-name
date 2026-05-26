/**
 * Next.js instrumentation —— 服务端启动时运行一次。
 * 职责:① 环境变量自检 ② 按运行时初始化 Sentry。
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateServerEnv } = await import("@/lib/env");
    validateServerEnv();
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// 让 Next.js 把服务端(含 Server Components / API)抛出的错误上报到 Sentry
export const onRequestError = Sentry.captureRequestError;

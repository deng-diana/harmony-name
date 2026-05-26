// Sentry 服务端初始化(由 instrumentation.ts 在 Node 运行时导入)。
// 没配 DSN 时不初始化 → 本地开发可不接 Sentry。
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1, // 采样 10% 的性能追踪,省额度
  });
}

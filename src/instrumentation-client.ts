// Sentry 浏览器端初始化(Next.js 自动加载此文件)。无 DSN 时跳过。
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

// 客户端路由切换的性能追踪
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

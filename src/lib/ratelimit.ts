/**
 * 限流 (5.4) —— 防刷 / 防恶意烧 AI 额度
 * =====================================
 * 每个用户每分钟最多 N 次生成(滑动窗口)。即便用户还有积分,也挡住脚本式的爆发请求。
 * 没配 Upstash 时为 null = 不限流(本地开发);生产配上 Upstash 后自动生效。
 */
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const generateRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "rl:generate",
      analytics: false,
    })
  : null;

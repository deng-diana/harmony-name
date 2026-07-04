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

// Second, IP-keyed limiter for /api/generate. The per-user limiter above does
// nothing against someone farming many free accounts from one machine (each new
// account resets the user-id window). This caps bursts per source IP.
export const generateIpRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 h"),
      prefix: "rl:generate:ip",
      analytics: false,
    })
  : null;

// Checkout limiter: creating Stripe sessions is cheap for us but a good abuse
// signal to blunt (session spam / card testing). 10 per 10 minutes per user id.
export const checkoutRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 m"),
      prefix: "rl:checkout",
      analytics: false,
    })
  : null;

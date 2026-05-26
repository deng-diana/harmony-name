/**
 * Upstash Redis 客户端(服务端)
 * ==============================
 * 用于:① 限流(@upstash/ratelimit) ② RAG 结果的共享 KV 缓存。
 *
 * 设计:没配 Upstash 环境变量时返回 null —— 调用方据此【优雅降级】
 *       (本地开发不配也能跑;限流跳过、缓存退回进程内 Map)。
 *
 * 需要的环境变量(在 Upstash 控制台创建 Redis 后获得):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

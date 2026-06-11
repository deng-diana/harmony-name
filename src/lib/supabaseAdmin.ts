/**
 * Supabase ADMIN 客户端 (service_role —— "上帝钥匙") —— 懒加载单例。
 * ==================================================
 * ⚠️ 仅限服务端 (API Routes / Server Components) 使用,绝不能在浏览器代码里 import!
 *
 * 为什么用 service_role key?
 * - 它会【绕过 RLS (行级安全)】,能读写任意行
 * - 用途: 系统级操作 —— 如发放积分、读公开诗词数据
 *
 * 为什么懒加载 (getSupabaseAdmin())? 见 openai.ts 顶部注释 —— 顶层 `createClient(URL!, ...)`
 * 会在 `next build` 加载 route 模块时执行,缺 NEXT_PUBLIC_SUPABASE_URL 会抛
 * "supabaseUrl is required." → 整个构建失败(典型坑:Vercel Preview 没配 env)。
 * 推迟到首次调用才创建,构建就永远不依赖密钥。
 *
 * 普通"以用户身份"的读写,请改用 src/lib/supabase/server.ts (anon key + RLS 约束)。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not set");
    }
    client = createClient(url, serviceRoleKey, {
      auth: {
        // 服务端不需要持久化/自动刷新会话
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return client;
}

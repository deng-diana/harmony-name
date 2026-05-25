/**
 * Supabase ADMIN 客户端 (service_role —— "上帝钥匙")
 * ==================================================
 * ⚠️ 仅限服务端 (API Routes / Server Components) 使用,绝不能在浏览器代码里 import!
 *
 * 为什么用 service_role key?
 * - 它会【绕过 RLS (行级安全)】,能读写任意行
 * - 用途: 系统级操作 —— 如发放积分、读公开诗词数据
 *
 * 普通"以用户身份"的读写,请改用 src/lib/supabase/server.ts (anon key + RLS 约束)。
 */
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      // 服务端不需要持久化/自动刷新会话
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

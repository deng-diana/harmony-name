/**
 * Supabase 客户端 (服务端用)
 *
 * 为什么用 service_role key 而不是 publishable key?
 * - 这个文件只在 API Routes (服务端) 使用
 * - service_role key 绕过 RLS (Row Level Security)
 * - 诗词数据是公开的，不需要 RLS 限制
 *
 * ⚠️ 这个客户端绝对不能在前端代码中 import！
 */
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

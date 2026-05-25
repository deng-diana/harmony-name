/**
 * 浏览器端 Supabase 客户端 (anon key)
 * ===================================
 * 用在 "use client" 组件里 (如登录页、登出按钮)。
 * 用的是 anon public key —— 受 RLS 约束,只能读写当前登录用户有权限的数据。
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

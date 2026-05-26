/**
 * 积分操作工具 (服务端用)
 * ========================
 * 集中封装"扣分 / 退款 / 查余额",让 API 路由调用,避免逻辑分散重复。
 *
 * 安全模型回顾 (见 supabase/migrations/002):
 *   - deduct_credit():  用【用户会话】客户端调用,靠 auth.uid() 只扣自己的分
 *   - add_credits():    仅 service_role 可调,所以退款必须用 supabaseAdmin
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabaseAdmin";

export type DeductResult =
  | { ok: true; remaining: number }
  | { ok: false; code: "INSUFFICIENT_CREDITS" | "ERROR"; message: string };

/**
 * 原子扣 1 分。supabase 必须是"带用户会话"的服务端客户端
 * (来自 @/lib/supabase/server),这样 RPC 里的 auth.uid() 才能拿到用户身份。
 */
export async function deductCredit(
  supabase: SupabaseClient
): Promise<DeductResult> {
  const { data, error } = await supabase.rpc("deduct_credit");

  if (error) {
    // 余额不足时,SQL 函数 raise 'INSUFFICIENT_CREDITS',这里识别出来
    if (error.message.includes("INSUFFICIENT_CREDITS")) {
      return { ok: false, code: "INSUFFICIENT_CREDITS", message: error.message };
    }
    return { ok: false, code: "ERROR", message: error.message };
  }
  return { ok: true, remaining: data as number };
}

/**
 * 退还 1 分 (生成失败时调用)。用 admin 客户端,因为 add_credits 只授权给 service_role。
 * 故意吞掉错误并记日志:退款失败不应再把异常抛给用户(钱的问题宁可记录后人工兜底)。
 */
export async function refundCredit(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc("add_credits", {
    p_user_id: userId,
    p_amount: 1,
  });
  if (error) {
    console.error(`Refund failed for user ${userId}:`, error.message);
  }
}

/** 读取当前用户的积分余额 (RLS 自动限制为本人那一行)。 */
export async function getCredits(
  supabase: SupabaseClient
): Promise<number | null> {
  const { data } = await supabase
    .from("profiles")
    .select("credits")
    .single();
  return data?.credits ?? null;
}

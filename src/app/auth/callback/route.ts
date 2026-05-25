/**
 * OAuth 回调路由 (/auth/callback)
 * ================================
 * Google 登录(PKCE code 流程)的最后一步。
 *
 * 完整流程:
 *   1. 用户在登录页点 "Sign in with Google"
 *   2. signInWithOAuth 把用户跳到 Google 授权页
 *   3. Google 授权后跳回 Supabase 的 /auth/v1/callback
 *   4. Supabase 再带着 ?code=... 跳回这里(我们的 redirectTo)
 *   5. 这里用 exchangeCodeForSession 把 code 换成 session 并写入 cookie
 *   6. 跳转到 /app
 *
 * 为什么必须有这一步? OAuth 出于安全用的是"授权码",不是直接给 token。
 * 必须在服务端用 code 去换真正的 session,这样 token 永远不暴露在 URL 里。
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // 允许通过 ?next=/somewhere 指定登录后去向,默认回 /app
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 处理本地 / 预览 / 生产环境的 host(部署到 Vercel 时 x-forwarded-host 才准确)
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 没有 code 或换取失败 → 回登录页并带上错误标记
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}

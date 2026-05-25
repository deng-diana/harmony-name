/**
 * Session 刷新逻辑 (被 src/middleware.ts 调用)
 * ===========================================
 * 为什么需要它?
 * - 用户的登录 token 会过期。如果不在每个请求前刷新,用户会莫名其妙掉登录,
 *   或者 Server Component 读到的是过期身份。
 * - middleware 在请求到达页面之前运行,是刷新 cookie 的最佳位置。
 *
 * ⚠️ 注意两条铁律 (Supabase 官方强调):
 * 1. 创建 client 之后、调用 getUser() 之前,不要插入任何其他逻辑 —— 否则容易引发
 *    难以排查的"随机掉登录"问题。
 * 2. 必须原样返回 supabaseResponse(它携带了刷新后的 cookie)。
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 这一行会刷新会话并把新 cookie 写进 supabaseResponse。
  // 中间不要插入别的代码!
  await supabase.auth.getUser();

  return supabaseResponse;
}

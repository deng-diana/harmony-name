/**
 * 服务端 Supabase 客户端 (anon key + 从 cookie 读取用户身份)
 * =========================================================
 * 用在 Server Components / Route Handlers / Server Actions 里。
 *
 * 关键: 它通过 Next.js 的 cookies() 拿到浏览器带来的 session cookie,
 * 从而知道"当前请求是哪个登录用户",并同样受 RLS 约束。
 *
 * 想确认"用户是谁"时,永远用 supabase.auth.getUser() —— 它会向 Supabase 服务器
 * 校验 token 真伪。不要用 getSession()(它只读 cookie,可被伪造,服务端不可信)。
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 在 Server Component 里 cookies 是只读的,set 会抛错。
            // 这是预期内的 —— 真正刷新 cookie 的活由 middleware 负责。
          }
        },
      },
    }
  );
}

/**
 * /app 路由的守卫 + 顶部 Header (Server Component)
 * ===============================================
 * 渲染前用 getUser() 校验登录:未登录 → redirect /login;已登录 → 渲染。
 * 顶部统一用 AppHeader(logo + 头像下拉菜单,内含 My Names / Sign out)。
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCredits } from "@/lib/credits";
import { AppHeader } from "@/components/AppHeader";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 服务端读积分;生成成功后前端 router.refresh() 会重新执行这里,余额自动更新。
  const credits = (await getCredits(supabase)) ?? 0;
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;

  return (
    <div>
      <AppHeader
        email={user.email ?? ""}
        credits={credits}
        avatarUrl={avatarUrl}
      />
      {children}
    </div>
  );
}

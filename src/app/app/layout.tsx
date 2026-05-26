/**
 * /app 路由的守卫 (Server Component)
 * ==================================
 * 在页面渲染前,在服务端用 getUser() 校验登录态:
 * - 未登录 → 直接 redirect 到 /login (用户根本看不到 /app 的内容)
 * - 已登录 → 渲染页面,并在右上角显示邮箱 + 登出按钮
 *
 * 为什么放在 layout 而不是 page?
 * layout 包裹该路由下的所有页面,守卫写一次即可覆盖整个 /app 区域。
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCredits } from "@/lib/credits";
import { LogoutButton } from "@/components/LogoutButton";

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

  // 服务端读取积分余额。生成成功后前端调 router.refresh() 会重新执行这里,余额自动更新。
  const credits = (await getCredits(supabase)) ?? 0;

  return (
    <div className="relative">
      {/* 右上角浮动账户栏,不干扰原有页面布局 */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full"
          title="Naming credits remaining"
        >
          ✦ {credits} {credits === 1 ? "credit" : "credits"}
        </span>
        <span className="text-xs text-stone-500 hidden sm:inline">
          {user.email}
        </span>
        <LogoutButton />
      </div>
      {children}
    </div>
  );
}

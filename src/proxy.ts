import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16: "middleware" 约定已更名为 "proxy"(功能一致)。
// 每个请求到达页面前,先刷新 Supabase 会话,保持登录态新鲜。
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 跳过静态资源,避免无意义地在图片/字体请求上跑鉴权逻辑。
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

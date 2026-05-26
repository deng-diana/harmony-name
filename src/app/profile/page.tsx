/**
 * /profile —— 用户的"My Names":生成历史 + 收藏 (6.2)
 * 守卫:未登录 redirect /login。数据用"用户会话"客户端读(RLS 限本人)。
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCredits } from "@/lib/credits";
import { AppHeader } from "@/components/AppHeader";
import {
  ProfileTabs,
  type GenerationRow,
  type SavedRow,
} from "@/components/ProfileTabs";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const credits = (await getCredits(supabase)) ?? 0;
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;

  const { data: generations } = await supabase
    .from("generations")
    .select("id, created_at, input, result")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: saved } = await supabase
    .from("saved_names")
    .select("id, created_at, name_data")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <AppHeader
        email={user.email ?? ""}
        credits={credits}
        avatarUrl={avatarUrl}
      />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-8">
          My Names
        </h1>
        <ProfileTabs
          generations={(generations ?? []) as unknown as GenerationRow[]}
          saved={(saved ?? []) as unknown as SavedRow[]}
        />
      </main>
    </div>
  );
}

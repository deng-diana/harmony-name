/**
 * /profile —— 用户的"My Names":生成历史 + 收藏 (6.2)
 * 守卫:未登录 redirect /login。数据用"用户会话"客户端读(RLS 限本人)。
 */
import Link from "next/link";
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
      <AppHeader email={user.email ?? ""} credits={credits} />
      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* 醒目的积分卡:余额在左,充值在右 */}
        <div className="flex items-center justify-between bg-white border border-stone-200 rounded-2xl px-6 py-5 mb-8">
          <div>
            <div className="text-xs uppercase tracking-wider text-stone-400 font-bold mb-1">
              Your balance
            </div>
            <div className="text-3xl font-bold text-amber-700 leading-none">
              ✦ {credits}
            </div>
            <div className="text-sm text-stone-500 mt-1">naming credits</div>
          </div>
          <Link
            href="/buy"
            className="inline-flex items-center gap-2 bg-stone-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-stone-800 active:scale-[0.98] transition"
          >
            Buy more
          </Link>
        </div>

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

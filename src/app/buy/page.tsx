/**
 * /buy —— 充值页(选积分包)。需登录(买积分要知道给谁加)。
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCredits } from "@/lib/credits";
import { AppHeader } from "@/components/AppHeader";
import { BuyPacks } from "@/components/BuyPacks";

export const dynamic = "force-dynamic";

export default async function BuyPage() {
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

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <AppHeader
        email={user.email ?? ""}
        credits={credits}
        avatarUrl={avatarUrl}
      />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-2 text-center">
          Get more names
        </h1>
        <p className="text-stone-500 text-center mb-10">
          Each generation uses 1 credit. Buy a pack — credits never expire.
        </p>
        <BuyPacks />
        <p className="text-center text-xs text-stone-400 mt-8">
          Secure checkout by Stripe
        </p>
      </main>
    </div>
  );
}

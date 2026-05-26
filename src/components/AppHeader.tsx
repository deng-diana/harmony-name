/**
 * 顶部 Header —— logo + 积分余额(始终可见,点击去充值)+ 头像下拉。/app /profile /buy 共用。
 */
import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";

export function AppHeader({
  email,
  credits,
  avatarUrl,
}: {
  email: string;
  credits: number;
  avatarUrl?: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 bg-[#FDFBF7] border-b border-stone-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/app"
          className="font-serif font-bold text-lg text-stone-900 tracking-tight"
        >
          ✦ HarmonyName
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/buy"
            title="Buy more credits"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full hover:bg-amber-100 transition"
          >
            ✦ {credits} {credits === 1 ? "credit" : "credits"}
          </Link>
          <AccountMenu email={email} avatarUrl={avatarUrl} />
        </div>
      </div>
    </header>
  );
}

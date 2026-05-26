/**
 * 顶部 Header (6.2) —— logo + 头像下拉。/app 和 /profile 共用。
 * 纯展示组件,数据由调用方(server 组件)传入。
 */
import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";

export function AppHeader({
  email,
  credits,
}: {
  email: string;
  credits: number;
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
        <AccountMenu email={email} credits={credits} />
      </div>
    </header>
  );
}

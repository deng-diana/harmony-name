"use client";

/**
 * 账户下拉菜单 —— 头像(谷歌照片优先,首字母兜底)→ 邮箱 / My Names / Buy credits / Sign out
 * 积分余额现在显示在顶部导航栏(AppHeader),不再放这里。
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScrollText, LogOut, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AccountMenu({
  email,
  avatarUrl,
}: {
  email: string;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const initial = (email[0] ?? "?").toUpperCase();
  const showPhoto = avatarUrl && !imgError;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-stone-900 text-white font-bold hover:opacity-90 transition"
      >
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          initial
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-stone-100 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100">
              <div className="text-sm font-semibold text-stone-900 truncate">
                {email}
              </div>
            </div>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 transition"
            >
              <ScrollText className="w-4 h-4" /> My Names
            </Link>
            <Link
              href="/buy"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 transition"
            >
              <CreditCard className="w-4 h-4" /> Buy credits
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

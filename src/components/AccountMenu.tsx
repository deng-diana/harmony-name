"use client";

/**
 * 账户下拉菜单 (6.2) —— 头像按钮 → 邮箱 / My Names(Profile)/ Sign out
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScrollText, LogOut, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AccountMenu({
  email,
  credits,
}: {
  email: string;
  credits: number;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const initial = (email[0] ?? "?").toUpperCase();

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
        className="w-9 h-9 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center hover:opacity-90 transition"
      >
        {initial}
      </button>

      {open && (
        <>
          {/* 点击空白关闭 */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-stone-100 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100">
              <div className="text-sm font-semibold text-stone-900 truncate">
                {email}
              </div>
              <div className="text-xs text-amber-700 mt-0.5">
                ✦ {credits} {credits === 1 ? "credit" : "credits"}
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

"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition px-3 py-1.5 rounded-full border border-stone-200 bg-white/70 backdrop-blur hover:bg-white"
    >
      <LogOut className="w-3.5 h-3.5" /> Sign out
    </button>
  );
}

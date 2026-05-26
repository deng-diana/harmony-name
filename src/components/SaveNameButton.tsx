"use client";

/**
 * 收藏按钮 (6.2) —— ♥ 切换收藏一个名字
 * insert/delete public.saved_names(RLS 限制为本人;user_id 默认 auth.uid())。
 */
import { useState } from "react";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { NameOption } from "@/types";

export function SaveNameButton({
  name,
  initialSaved = false,
}: {
  name: NameOption;
  initialSaved?: boolean;
}) {
  const supabase = createClient();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const cleanHanzi = name.hanzi.replace(/[{}]/g, "");

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next); // 乐观更新
    try {
      if (next) {
        const { error } = await supabase
          .from("saved_names")
          .insert({ hanzi: cleanHanzi, name_data: name });
        // 已收藏过(唯一索引冲突)视为成功,不报错
        if (error && !/duplicate|unique/i.test(error.message)) throw error;
      } else {
        const { error } = await supabase
          .from("saved_names")
          .delete()
          .eq("hanzi", cleanHanzi);
        if (error) throw error;
      }
    } catch {
      setSaved(!next); // 失败回滚
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={saved ? "Remove from saved" : "Save this name"}
      className="transition-all hover:scale-110 disabled:opacity-50"
    >
      <Heart
        className={`w-5 h-5 ${
          saved
            ? "fill-red-500 text-red-500"
            : "text-stone-400 hover:text-red-400"
        }`}
      />
    </button>
  );
}

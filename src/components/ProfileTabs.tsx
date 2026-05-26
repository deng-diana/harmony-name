"use client";

/**
 * Profile 的两个 tab (6.2):History(生成历史)/ Saved(收藏的名字)
 */
import { useState } from "react";
import Link from "next/link";
import { ARCHETYPES } from "@/lib/bazi";
import { useTTS } from "@/hooks/useTTS";
import { NameCard } from "@/components/NameCard";
import type { NameOption } from "@/types";

export type GenerationRow = {
  id: string;
  created_at: string;
  input: { dayMaster?: string };
  result: { analysis?: string; names?: NameOption[] };
};
export type SavedRow = { id: string; created_at: string; name_data: NameOption };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProfileTabs({
  generations,
  saved,
}: {
  generations: GenerationRow[];
  saved: SavedRow[];
}) {
  const [tab, setTab] = useState<"history" | "saved">("history");
  const { playingNameIndex, handlePlayName } = useTTS();

  return (
    <div>
      {/* tab 切换 */}
      <div className="flex gap-2 mb-8 border-b border-stone-200">
        {(
          [
            ["history", `History (${generations.length})`],
            ["saved", `Saved (${saved.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold -mb-px border-b-2 transition ${
              tab === key
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-400 hover:text-stone-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* History */}
      {tab === "history" &&
        (generations.length === 0 ? (
          <Empty
            text="No generations yet."
            cta="Reveal your first name →"
          />
        ) : (
          <div className="space-y-8">
            {generations.map((g) => {
              const archetype = g.input?.dayMaster
                ? ARCHETYPES[g.input.dayMaster as keyof typeof ARCHETYPES]
                : undefined;
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider text-stone-400 font-bold">
                      {fmtDate(g.created_at)}
                    </span>
                    {archetype && (
                      <span className="text-xs text-amber-700 font-semibold">
                        {archetype.title}
                      </span>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {(g.result?.names ?? []).map((n, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-xl border border-stone-200 p-4"
                      >
                        <div className="text-2xl font-serif text-stone-900">
                          {n.hanzi.replace(/[{}]/g, "")}
                        </div>
                        <div className="text-xs text-stone-500 mb-2">
                          {n.pinyin}
                        </div>
                        <p className="text-xs text-stone-600 italic line-clamp-3">
                          &ldquo;{n.poeticMeaning}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {/* Saved */}
      {tab === "saved" &&
        (saved.length === 0 ? (
          <Empty
            text="No saved names yet. Tap the ♥ on a name to keep it here."
            cta="Find a name →"
          />
        ) : (
          <div className="grid gap-8">
            {saved.map((s, index) => (
              <NameCard
                key={s.id}
                name={s.name_data}
                index={index}
                playingNameIndex={playingNameIndex}
                onPlayName={handlePlayName}
                defaultSaved
              />
            ))}
          </div>
        ))}
    </div>
  );
}

function Empty({ text, cta }: { text: string; cta: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-stone-500 mb-4">{text}</p>
      <Link
        href="/app"
        className="inline-block text-sm font-semibold text-stone-900 underline underline-offset-4 hover:text-stone-600"
      >
        {cta}
      </Link>
    </div>
  );
}

"use client";

import { Volume2 } from "lucide-react";
import type { NameOption } from "@/types";
import { ShareNameButton } from "@/components/ShareCard";
import { SaveNameButton } from "@/components/SaveNameButton";
import { PoemCaption } from "@/components/PoemCaption";

interface NameCardProps {
  name: NameOption;
  index: number;
  playingNameIndex?: number | null;
  onPlayName?: (hanzi: string, index: number) => void;
  archetype?: { title: string; subtitle: string };
  defaultSaved?: boolean;
  /** Landing page and /n/[slug]: hide play/share/save (they require auth/context). */
  readOnly?: boolean;
  /** Per-result public share URL (/n/<slug>); forwarded to the share button. */
  shareUrl?: string;
}

export function NameCard({
  name,
  index,
  playingNameIndex,
  onPlayName,
  archetype,
  defaultSaved,
  readOnly,
  shareUrl,
}: NameCardProps) {
  const cleanHanzi = name.hanzi.replace(/[{}]/g, "");

  return (
    <div className="bg-paper-raised rounded-2xl p-8 sm:p-10 shadow-soft border border-mist/70 hover:shadow-soft-lifted hover:-translate-y-0.5 transition-soft relative overflow-hidden group">
      {/* Watermark — first char of the name, in brush font; deeper on hover */}
      <div
        className="absolute -right-8 top-6 font-brush text-[10rem] leading-none text-ink/[0.045] group-hover:text-ink/[0.065] select-none pointer-events-none transition-colors"
        aria-hidden
        lang="zh-Hans"
      >
        {cleanHanzi.charAt(0)}
      </div>

      <div className="relative z-10">
        {/* ── NAME PLATE ─────────────────────────────────────────────────── */}
        <div className="text-center mb-6">
          <h3
            className="font-brush text-7xl sm:text-8xl text-ink leading-none tracking-normal mb-4"
            lang="zh-Hans"
          >
            {cleanHanzi}
          </h3>

          <p className="text-lg text-ink-soft tracking-[0.15em] font-serif">
            {name.pinyin}
          </p>

          {!readOnly && (
            <div className="flex items-center justify-center gap-4 mt-3">
              <button
                onClick={() => onPlayName?.(name.hanzi, index)}
                className={`transition-soft ${
                  playingNameIndex === index
                    ? "text-gold animate-pulse"
                    : "hover:text-ink cursor-pointer text-ink-soft"
                }`}
                aria-label="Play name pronunciation"
              >
                <Volume2 className="w-5 h-5" />
              </button>
              <ShareNameButton
                name={name}
                archetype={archetype}
                shareUrl={shareUrl}
              />
              <SaveNameButton name={name} initialSaved={defaultSaved} />
            </div>
          )}
        </div>

        {/* Poetic meaning */}
        <p className="text-lg text-ink font-serif italic leading-relaxed text-center max-w-prose mx-auto mt-6">
          &ldquo;{name.poeticMeaning}&rdquo;
        </p>

        {/* Museum hairline divider — a single gold rule, not a full-width border */}
        <div className="mx-auto my-8 h-px w-16 bg-gold-soft" />

        {/* ── MUSEUM CAPTION ─────────────────────────────────────────────── */}
        {name.culturalHeritage && (
          <PoemCaption heritage={name.culturalHeritage} hanzi={name.hanzi} />
        )}

        {/* ── ANATOMY ────────────────────────────────────────────────────── */}
        <div className="mt-8 pt-7 border-t border-mist/60">
          <h4 className="text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-4 text-center">
            Character by character
          </h4>
          <div className="space-y-3">
            {name.anatomy?.map((char, idx) => (
              <div key={idx} className="flex items-center gap-4">
                {/* Char tile in brush font — the calligraphic treatment extends to anatomy */}
                <div
                  className="w-10 h-10 bg-ink text-paper rounded-lg flex items-center justify-center font-brush text-xl flex-shrink-0"
                  lang="zh-Hans"
                >
                  {char.char}
                </div>
                <div className="flex-1 flex items-center text-sm text-ink-soft">
                  <span>{char.meaning}</span>
                </div>
                <div className="text-[10px] font-bold px-2.5 py-1 bg-mist/60 text-ink-soft rounded-full border border-mist flex-shrink-0">
                  {char.element}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

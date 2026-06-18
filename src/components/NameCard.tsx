"use client";

import { Volume2 } from "lucide-react";
import type { NameOption } from "@/types";
import { renderPoem } from "@/lib/render-poem";
import { ShareNameButton } from "@/components/ShareCard";
import { SaveNameButton } from "@/components/SaveNameButton";

interface NameCardProps {
  name: NameOption;
  index: number;
  playingNameIndex?: number | null;
  onPlayName?: (hanzi: string, index: number) => void;
  archetype?: { title: string; subtitle: string };
  defaultSaved?: boolean;
  /** 落地页等未登录/纯展示场景:隐藏发音/分享/收藏等交互按钮(点击会依赖 auth/context 而报错)。 */
  readOnly?: boolean;
}

export function NameCard({
  name,
  index,
  playingNameIndex,
  onPlayName,
  archetype,
  defaultSaved,
  readOnly,
}: NameCardProps) {
  const cleanHanzi = name.hanzi.replace(/[{}]/g, "");

  return (
    <div className="bg-paper-raised rounded-2xl p-7 sm:p-9 shadow-soft border border-mist/70 hover:shadow-soft-lifted hover:-translate-y-0.5 transition-soft relative overflow-hidden group">
      {/* 水印汉字 —— 极淡墨色,hover 时微微加深(参考:墨落宣纸的克制层次) */}
      <div className="absolute -right-10 -top-10 text-[11rem] leading-none font-serif text-ink/[0.04] group-hover:text-ink/[0.06] select-none pointer-events-none transition-colors">
        {cleanHanzi.charAt(0)}
      </div>

      <div className="relative z-10">
        <div className="mb-7 text-left">
          <h3 className="text-5xl sm:text-6xl font-serif text-ink tracking-tight mb-3 leading-none">
            {cleanHanzi}
          </h3>
          <div className="flex items-center gap-3 text-ink-soft">
            <span className="text-lg font-medium tracking-wide font-serif">
              {name.pinyin}
            </span>
            {!readOnly && (
              <>
                <button
                  onClick={() => onPlayName?.(name.hanzi, index)}
                  className={`transition-soft ${
                    playingNameIndex === index
                      ? "text-gold animate-pulse"
                      : "hover:text-ink cursor-pointer"
                  }`}
                  aria-label="Play name pronunciation"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
                <ShareNameButton name={name} archetype={archetype} />
                <SaveNameButton name={name} initialSaved={defaultSaved} />
              </>
            )}
          </div>
          <div className="mt-5">
            <p className="text-lg text-ink font-serif italic leading-relaxed">
              &ldquo;{name.poeticMeaning}&rdquo;
            </p>
          </div>
        </div>

        {/* 内部竖向堆叠(右列已变窄,并排会挤);出处在上、字形拆解在下 */}
        <div className="grid gap-7 pt-7 border-t border-mist/60">
          <div>
            <h4 className="text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-3">
              Cultural Heritage
            </h4>
            <div className="bg-gold-soft/10 p-5 rounded-xl border border-mist/50">
              <p className="text-ink font-serif text-lg mb-2 leading-relaxed">
                {renderPoem(
                  name.culturalHeritage?.original || "",
                  name.hanzi
                )}
              </p>
              {/* translation 可能为空(deterministic rescue 路径没走 LLM 翻译),
                  此时不要渲染一对空引号,以免出现尴尬的 "" */}
              {name.culturalHeritage?.translation?.trim() && (
                <p className="text-sm text-ink-soft italic mb-3 border-l-2 border-gold-soft pl-3">
                  &ldquo;{name.culturalHeritage.translation}&rdquo;
                </p>
              )}
              <div className="text-[10px] text-ink-faint font-bold uppercase tracking-wide">
                Source: {name.culturalHeritage?.source}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-3">
              The Anatomy
            </h4>
            <div className="space-y-3">
              {name.anatomy?.map((char, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-ink text-paper rounded-lg flex items-center justify-center font-serif text-lg flex-shrink-0">
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
    </div>
  );
}

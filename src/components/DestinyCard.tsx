"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { BaziResult } from "@/lib/bazi";
import { ARCHETYPES } from "@/lib/bazi";
import { ELEMENTS, type Element } from "@/lib/elements";
import { HighlightText } from "./HighlightText";
import { ShareElementButton } from "./ElementShareCard";
import { ElementCompatibility } from "./ElementCompatibility";
import { cn } from "@/lib/cn";

/**
 * 极简身份卡(2026-06-18 重构):面向看不懂命理的外国用户。
 * 只留【身份】(原型 + 诗意描述)+【一句大白话解读】(季节性格 + 你被什么点亮)。
 * 刻意去掉:五行轮盘/数字、"Weak"、"五行循环"footnote、五族相性表 —— 都是术语/杂讯。
 */

// 喜用神 → 大白话、温暖、零术语的一句话(替代 ELEMENTS.essence 里偏术语的措辞)。
const FRIENDLY_ELEMENT: Record<string, string> = {
  Water: "calm, flowing water — depth, quiet, and a steady inner current",
  Wood: "growth and new ideas — the things that keep reaching upward",
  Fire: "warmth and passion — and the people who light you up",
  Earth: "solid ground — comfort, patience, and a sense of home",
  Metal: "clarity and focus — a clean, refined edge",
};

export function DestinyCard({ baziResult }: { baziResult: BaziResult }) {
  const dayMaster = baziResult.dayMaster;
  const archetype = ARCHETYPES[dayMaster as keyof typeof ARCHETYPES];
  const glyph = ELEMENTS[dayMaster as Element]?.archetypeGlyph ?? "✦";
  const fav = baziResult.favourableElements;

  // 季节能量(一句友好的"为什么你是这样"),其余命理细节一律不展示
  const seasonal = baziResult.coreExplanation.points.find((p) =>
    /season/i.test(p.label)
  );

  // "Who you naturally click with" — collapsed by default to keep the naming flow clean.
  const [compatOpen, setCompatOpen] = useState(false);

  return (
    <section className="bg-paper-raised rounded-3xl shadow-soft border border-mist/70 overflow-hidden">
      {/* ===== 身份(唯一的"主角")===== */}
      <div className="bg-ink p-8 md:p-10 text-paper text-center">
        <div className="text-6xl mb-3 leading-none">{glyph}</div>
        <p className="text-gold text-xs font-bold uppercase tracking-[0.2em] mb-3">
          {archetype.subtitle}
        </p>
        <h2 className="text-3xl md:text-4xl font-serif font-medium text-paper mb-4">
          {archetype.title}
        </h2>
        <p className="text-paper/75 max-w-2xl mx-auto leading-relaxed text-base md:text-lg font-light mb-6">
          {archetype.desc}
        </p>
        <ShareElementButton
          dayMaster={dayMaster}
          archetype={archetype}
          favourableElements={fav}
        />
      </div>

      {/* ===== 一句大白话解读:你为什么是这样 + 什么点亮你 ===== */}
      <div className="p-8 md:p-10">
        {seasonal && (
          <p className="text-base text-ink-soft leading-relaxed mb-7">
            <HighlightText text={seasonal.content} />
          </p>
        )}

        {fav.length > 0 && (
          <>
            <p className="text-ink font-medium mb-4">You come alive around:</p>
            <ul className="space-y-3.5">
              {fav.map((e) => {
                const t = ELEMENTS[e as Element];
                return (
                  <li
                    key={e}
                    className="flex items-start gap-3 text-ink-soft leading-relaxed"
                  >
                    <span className="text-xl leading-none shrink-0">
                      {t?.emoji ?? "✦"}
                    </span>
                    <span>{FRIENDLY_ELEMENT[e] ?? t?.essence ?? e}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* ===== Who you naturally click with (collapsible, default closed) ===== */}
        <div className="mt-8 border-t border-mist/70 pt-6">
          <button
            type="button"
            onClick={() => setCompatOpen((v) => !v)}
            aria-expanded={compatOpen}
            className="flex w-full items-center justify-between gap-3 text-left text-ink font-medium hover:text-gold transition-colors"
          >
            <span>Who you naturally click with</span>
            <ChevronDown
              className={cn(
                "w-5 h-5 shrink-0 transition-transform duration-300",
                compatOpen && "rotate-180"
              )}
              aria-hidden
            />
          </button>

          {compatOpen && (
            <div className="animate-fade-in">
              <ElementCompatibility
                dayMaster={dayMaster}
                favourableElements={baziResult.favourableElements}
                avoidElements={baziResult.avoidElements}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

"use client";

import type { BaziResult } from "@/lib/bazi";
import { ARCHETYPES } from "@/lib/bazi";
import { ELEMENTS, type Element } from "@/lib/elements";
import { HighlightText } from "./HighlightText";
import { ShareElementButton } from "./ElementShareCard";
import { ElementCompatibility } from "./ElementCompatibility";

/**
 * DestinyCard — the user's elemental identity (left panel on the results page).
 *
 * Museum redesign (2026-07-05):
 * - Emoji archetype glyph → brush-font hanzi (木/火/土/金/水) on the ink header
 * - Season · direction chip below the hanzi
 * - 相生相克 section is always visible (no accordion) — story-first layout
 */

// Plain-language mapping for the favourable elements — zero jargon.
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
  const elData = ELEMENTS[dayMaster as Element];
  const fav = baziResult.favourableElements;

  // Seasonal energy line — one friendly sentence about "why you are this way".
  const seasonal = baziResult.coreExplanation.points.find((p) =>
    /season/i.test(p.label)
  );

  return (
    <section className="bg-paper-raised rounded-3xl shadow-soft border border-mist/70 overflow-hidden">
      {/* ── IDENTITY HEADER (ink background) ─────────────────────────────── */}
      <div className="bg-ink p-8 md:p-10 text-paper text-center">
        {/* Brush-font element hanzi replaces emoji — the museum move */}
        <div
          className="font-brush text-8xl leading-none text-paper/95 mb-2"
          lang="zh-Hans"
          aria-label={dayMaster}
        >
          {elData?.hanzi ?? "✦"}
        </div>

        {/* Season · direction chip below the hanzi */}
        {elData && (
          <div className="inline-block border border-gold/60 text-gold text-[11px] tracking-[0.25em] uppercase px-3 py-1 mb-3">
            {elData.season} · {elData.direction}
          </div>
        )}

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

      {/* ── BODY ──────────────────────────────────────────────────────────── */}
      <div className="p-8 md:p-10">
        {/* Seasonal context sentence */}
        {seasonal && (
          <p className="text-base text-ink-soft leading-relaxed mb-7">
            <HighlightText text={seasonal.content} />
          </p>
        )}

        {/* "You come alive around" — favourable elements */}
        {fav.length > 0 && (
          <>
            <p className="text-ink font-medium mb-4">You come alive around:</p>
            <ul className="space-y-3.5 mb-8">
              {fav.map((e) => {
                const t = ELEMENTS[e as Element];
                return (
                  <li
                    key={e}
                    className="flex items-start gap-3 text-ink-soft leading-relaxed"
                  >
                    {/* Brush hanzi instead of emoji */}
                    <span
                      className="font-brush text-xl leading-none shrink-0"
                      lang="zh-Hans"
                      aria-label={e}
                    >
                      {t?.hanzi ?? "✦"}
                    </span>
                    <span>{FRIENDLY_ELEMENT[e] ?? t?.essence ?? e}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* ── 相生相克 RELATIONS — always visible, story-first ──────────── */}
        <ElementCompatibility
          dayMaster={dayMaster}
          favourableElements={baziResult.favourableElements}
          avoidElements={baziResult.avoidElements}
        />
      </div>
    </section>
  );
}

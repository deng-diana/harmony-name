"use client";

/**
 * PoemCaption — museum-label citation block for a generated name.
 *
 * Structure (top to bottom, per Art Institute of Chicago / Harvard Art Museums
 * object-label conventions):
 *   1. Header: "From the line"
 *   2. Poem line with per-character ruby pinyin; given-name chars in seal-red
 *   3. English translation
 *   4. Tombstone: poet hanzi + romanisation · dynasty · 《title》
 *   5. Provenance microline: "found here, not invented"
 *
 * Pinyin is computed client-side via pinyin-pro (already a project dependency)
 * so no backend change is required. For pre-museum archived generations that
 * lack the {} brace markers, we fall back to character-set matching (same logic
 * as renderPoem).
 */

import { useMemo } from "react";
import { pinyin as pinyinPro } from "pinyin-pro";
import { segmentPoem } from "@/lib/render-poem";

interface PoemCaptionProps {
  heritage: { source: string; original: string; translation: string };
  hanzi: string; // full hanzi including surname, e.g. "张皎" or "{张}{皎}"
}

/** Return toned pinyin for a single CJK character; empty string for punctuation. */
function charPinyin(char: string): string {
  if (!char || char.trim() === "") return "";
  // pinyin-pro returns an array of readings for each input char when type="array"
  const result = pinyinPro(char, { toneType: "symbol", type: "array" }) as string[];
  return result[0] ?? "";
}

/**
 * Parse the source string built by hydrate():
 * Format: 《title》— author (dynasty)
 * Example: "《酬殷上人秋夜山亭有赠》— 陈子昂 (Tang Dynasty)"
 * Returns null when the format doesn't match (falls back to raw string display).
 */
function parseSource(source: string): {
  title: string;
  author: string;
  authorPinyin: string;
  dynasty: string;
} | null {
  if (!source) return null;
  const m = source.match(/^《(.+)》[—\-–]\s*(.+)\s+\((.+)\)$/);
  if (!m) return null;
  const [, title, author, dynasty] = m;
  const authorPinyin = pinyinPro(author.trim(), {
    toneType: "symbol",
    type: "string",
    separator: " ",
  }) as string;
  return { title: title.trim(), author: author.trim(), authorPinyin, dynasty: dynasty.trim() };
}

export function PoemCaption({ heritage, hanzi }: PoemCaptionProps) {
  const { original = "", translation, source = "" } = heritage;

  // Segment the poem line once; memoised to avoid re-running on every render.
  const segments = useMemo(() => segmentPoem(original, hanzi), [original, hanzi]);

  // Count highlighted (given-name) characters for provenance microline grammar.
  const highlightCount = segments.filter((s) => s.highlighted).length;

  // Compute per-character pinyin; same memo dependency as segments.
  const charPinyins = useMemo(
    () => segments.map((s) => (s.isPunctuation ? "" : charPinyin(s.char))),
    [segments]
  );

  const parsed = useMemo(() => parseSource(source), [source]);

  const provenanceLine =
    highlightCount === 1
      ? "The highlighted character is yours — found here, not invented."
      : "The highlighted characters are yours — found here, not invented.";

  return (
    <div className="text-center">
      {/* Section header */}
      <h4 className="text-[11px] font-bold text-ink-faint uppercase tracking-wider mb-4">
        From the line
      </h4>

      {/* Poem line with per-character ruby pinyin */}
      {segments.length > 0 && (
        <p className="text-cjk flex flex-wrap justify-center gap-0.5 mb-1" lang="zh-Hans">
          {segments.map((seg, i) => {
            if (seg.isPunctuation) {
              return (
                <ruby key={i} className="font-hanzi text-2xl leading-loose text-ink">
                  {seg.char}
                </ruby>
              );
            }
            const py = charPinyins[i];
            return (
              <ruby
                key={i}
                className={`font-hanzi text-2xl leading-loose mx-0.5 ${
                  seg.highlighted
                    ? "text-seal font-bold"
                    : "text-ink"
                }`}
              >
                {seg.char}
                {py && (
                  <rt
                    className={`text-[10px] font-serif tracking-wide not-italic ${
                      seg.highlighted ? "text-seal-soft" : "text-ink-faint"
                    }`}
                  >
                    {py}
                  </rt>
                )}
              </ruby>
            );
          })}
        </p>
      )}

      {/* English translation */}
      {translation?.trim() && (
        <p className="font-serif italic text-base text-ink-soft mt-3 max-w-md mx-auto leading-relaxed">
          &ldquo;{translation}&rdquo;
        </p>
      )}

      {/* Tombstone credit line: poet-first, per museum label convention */}
      <div className="mt-4">
        {parsed ? (
          <>
            <p className="text-sm">
              <span className="font-hanzi text-ink" lang="zh-Hans">
                {parsed.author}
              </span>{" "}
              <span className="text-ink-soft">{parsed.authorPinyin}</span>
              <span className="text-ink-faint">
                {" "}
                · {parsed.dynasty.toLowerCase().replace(/\s+dynasty$/i, "")} dynasty
              </span>
            </p>
            <p className="font-hanzi text-sm text-ink-faint mt-0.5" lang="zh-Hans">
              《{parsed.title}》
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-faint">{source}</p>
        )}
      </div>

      {/* Provenance microline — the pipeline's core guarantee in plain language */}
      <p className="text-[11px] italic text-ink-faint mt-4 leading-relaxed">
        {provenanceLine}
      </p>
    </div>
  );
}

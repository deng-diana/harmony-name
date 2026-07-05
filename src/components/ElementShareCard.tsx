"use client";

/**
 * ElementShareCard — the element-identity social-share artifact.
 *
 * "Share my element" -> a 3:4 portrait card (330x440 px) on dark ink bg:
 *   - brush hanzi glyph hero (木/火/土/金/水) instead of emoji
 *   - season · direction chip in gold border
 *   - archetype title in Noto Serif SC
 *   - "flow toward" line with hanzi element names
 *   - footer: "What element are you?" + harmonyname.com
 *
 * document.fonts.ready + explicit load() ensure Ma Shan Zheng is rasterized
 * before html-to-image captures the card — same guard as ShareCard.tsx.
 */

import { useRef, useState } from "react";
import { Sparkles, Share2, Download, X } from "lucide-react";
import { ELEMENTS, type Element } from "@/lib/elements";

interface Archetype {
  title: string;
  subtitle: string;
  desc: string;
}

export function ShareElementButton({
  dayMaster,
  archetype,
  favourableElements,
}: {
  dayMaster: string;
  archetype: Archetype;
  favourableElements: string[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const elementData = ELEMENTS[dayMaster as Element];
  // archetypeGlyph (emoji) is used in the share text for emoji-friendly surfaces
  const glyph = elementData?.archetypeGlyph ?? "✦";
  // hanzi is the brush character rendered in the card itself
  const hanziGlyph = elementData?.hanzi ?? "";
  const season = elementData?.season ?? "";
  const direction = elementData?.direction ?? "";

  // "flow toward" label: hanzi + English name per element (e.g. "木 Wood & 火 Fire")
  const favs = favourableElements
    .map((e) => `${ELEMENTS[e as Element]?.hanzi ?? ""} ${e}`)
    .join(" & ");
  const flowLine = favs ? `I flow toward ${favs}` : archetype.subtitle;

  // Share text for the native share sheet: keeps emoji for visual richness in SMS
  const shareText = `${glyph} I'm ${archetype.title}. ${archetype.subtitle}. What element are you? ✦`;

  const capture = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const { toPng } = await import("html-to-image");
    // Wait for Ma Shan Zheng CJK slices (unicode-range served fonts) before
    // capturing so the brush hanzi renders correctly rather than falling back.
    await document.fonts.ready;
    await document.fonts
      .load('1rem "Ma Shan Zheng"', hanziGlyph)
      .catch(() => {});
    const dataUrl = await toPng(cardRef.current, {
      pixelRatio: 3, // 3x -> 990x1320; crisp on retina social feeds
      cacheBust: true,
      backgroundColor: "#1C1917",
    });
    return (await fetch(dataUrl)).blob();
  };

  const download = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${archetype.title.replace(/\s+/g, "-")}-harmonyname.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    setBusy(true);
    setError(null);
    let blob: Blob | null = null;
    try {
      blob = await capture();
      if (!blob) {
        setError("Couldn't create the image. Please try again.");
        return;
      }
      const file = new File([blob], "my-element.png", { type: "image/png" });
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          text: shareText,
          url: "https://harmonyname.com",
        });
      } else {
        download(blob);
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      if (blob) download(blob);
      else setError("Couldn't share. Please try Save image.");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await capture();
      if (blob) download(blob);
      else setError("Couldn't create the image. Please try again.");
    } catch {
      setError("Couldn't create the image. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition active:scale-95 backdrop-blur-sm border border-white/15"
      >
        <Sparkles className="w-4 h-4" /> Share my element
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-auto"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex flex-col items-center gap-4 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ===== Capture target: 3:4 portrait card (330x440) ===== */}
            <div
              ref={cardRef}
              className="w-[330px] h-[440px] bg-ink flex flex-col items-center justify-between px-8 py-9 text-paper"
            >
              {/* Header */}
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold">
                ✦ HarmonyName
              </div>

              {/* Center block */}
              <div className="flex flex-col items-center text-center">
                {/* Brush hanzi hero — replaces the emoji archetypeGlyph */}
                {hanziGlyph && (
                  <div
                    className="font-brush leading-none mb-4 text-paper"
                    style={{ fontSize: "7rem" }}
                    lang="zh-Hans"
                    aria-hidden
                  >
                    {hanziGlyph}
                  </div>
                )}

                {/* Season · direction chip in a thin gold border */}
                {(season || direction) && (
                  <div className="text-[11px] uppercase tracking-[0.25em] text-gold-soft border border-gold/40 px-3 py-0.5 mb-3">
                    {season}
                    {season && direction ? " · " : ""}
                    {direction}
                  </div>
                )}

                {/* Archetype title */}
                <div className="text-3xl font-serif tracking-wide mb-4 text-paper">
                  {archetype.title}
                </div>

                {/* Gold hairline divider */}
                <div className="w-10 h-px bg-gold-soft/40 mb-4" />

                {/* "Flow toward" line */}
                <p className="text-[13px] text-gold-soft tracking-wide">
                  {flowLine}
                </p>
              </div>

              {/* Footer */}
              <div className="flex flex-col items-center text-center">
                <p className="text-[12px] text-paper/70 italic mb-2 font-serif">
                  What element are you?
                </p>
                <div className="text-[10px] uppercase tracking-[0.2em] text-paper/40">
                  harmonyname.com
                </div>
              </div>
            </div>

            {/* ===== Action buttons (outside the captured card) ===== */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-white text-stone-900 px-5 py-3 rounded-full font-semibold text-sm hover:bg-stone-100 active:scale-95 transition disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" /> {busy ? "Preparing…" : "Share"}
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-5 py-3 rounded-full font-semibold text-sm hover:bg-white/20 active:scale-95 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Save
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="inline-flex items-center justify-center w-11 h-11 bg-white/10 text-white border border-white/20 rounded-full hover:bg-white/20 active:scale-95 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-200 bg-red-900/40 px-4 py-2 rounded-full">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

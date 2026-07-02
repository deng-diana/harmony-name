"use client";

/**
 * 元素身份分享卡 —— 增长引擎(社交化)。
 * 用户拿到"元素身份"(如 🌲 The Resilient Pine)后,这是最想截图发圈的瞬间。
 * 点 "Share my element" → 一张竖版身份卡 → 截成 PNG → 原生分享 / 下载。
 * 配文自带社交问句 "What element are you?" 形成拉新回环。
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

  const glyph = ELEMENTS[dayMaster as Element]?.archetypeGlyph ?? "✦";
  const favs = favourableElements
    .map((e) => `${ELEMENTS[e as Element]?.emoji ?? ""} ${e}`)
    .join(" & ");
  const flowLine = favs ? `I flow toward ${favs}` : archetype.subtitle;
  const shareText = `${glyph} I'm ${archetype.title}. ${flowLine}. What element are you? ✦`;

  const capture = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(cardRef.current, {
      pixelRatio: 2,
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
      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText, url: "https://harmonyname.com" });
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
            {/* ===== 截图目标:竖版身份卡 (3:4) ===== */}
            <div
              ref={cardRef}
              className="w-[330px] h-[440px] bg-stone-900 flex flex-col items-center justify-between px-8 py-9 text-stone-50"
              style={{ fontFamily: "Lora, Georgia, serif" }}
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-500/90">
                ✦ HarmonyName
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="text-7xl mb-4 leading-none">{glyph}</div>
                <div className="text-[11px] uppercase tracking-[0.25em] text-stone-400 mb-2">
                  {archetype.subtitle}
                </div>
                <div className="text-3xl font-medium tracking-tight mb-4">
                  {archetype.title}
                </div>
                <div className="w-10 h-px bg-stone-600 mb-4" />
                <p className="text-[13px] text-amber-200/90 tracking-wide">
                  {flowLine}
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <p className="text-[12px] text-stone-300 italic mb-2">
                  What element are you?
                </p>
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
                  harmonyname.com
                </div>
              </div>
            </div>

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

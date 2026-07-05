"use client";

/**
 * ShareCard — the name's social-share artifact.
 *
 * Clicking Share opens a 3:4 portrait card (330x440 px) rendered as DOM so
 * that Ma Shan Zheng (brush font) and Noto Serif SC are rasterized correctly
 * by html-to-image. document.fonts.ready + an explicit load() call ensure
 * that CJK unicode-range slices are fetched before capture.
 *
 * Card anatomy (top to bottom):
 *   - header: HARMONYNAME brand mark
 *   - center: brush name, pinyin, highlighted poem line, translation, tombstone
 *   - footer: archetype line + "Every name lives in a poem" left; QR right
 *
 * On mobile (Web Share API + canShare files): native share sheet with PNG.
 * On desktop: download the PNG directly.
 */

import { useRef, useState } from "react";
import { Share2, Download, X } from "lucide-react";
import type { NameOption } from "@/types";
import { segmentPoem, type PoemSegment } from "@/lib/render-poem";

interface Archetype {
  title: string;
  subtitle: string;
}

/** Parse "《title》— author (dynasty)" into its components. Falls back gracefully. */
function parseSource(source: string) {
  const authorMatch = source.match(/—\s*([^(]+)\s*\(/);
  const dynastyMatch = source.match(/\(([^)]+)\)/);
  return {
    author: authorMatch?.[1]?.trim() ?? "",
    dynasty: dynastyMatch?.[1]?.trim() ?? "",
  };
}

/**
 * Generate a QR-code data URL via the `qrcode` package (CJS module;
 * accessed defensively to handle bundler interop differences).
 * Dynamic-imported at share time so it never enters the first-load bundle.
 */
async function generateQrDataUrl(url: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = (await import("qrcode")) as any;
  const fn: (text: string, opts: object) => Promise<string> =
    typeof mod.toDataURL === "function"
      ? mod.toDataURL
      : mod.default?.toDataURL;
  return fn(url, {
    margin: 1,
    width: 256,
    color: { dark: "#1c1917", light: "#fdfbf7" },
  });
}

export function ShareNameButton({
  name,
  archetype,
  label,
  shareUrl,
}: {
  name: NameOption;
  archetype?: Archetype;
  /** When provided, renders a labeled gold-accent button instead of the bare icon. */
  label?: string;
  /** Per-result public page URL (/n/<slug>). Falls back to homepage if absent. */
  shareUrl?: string;
}) {
  const targetUrl = shareUrl ?? "https://harmonyname.com";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const cleanHanzi = name.hanzi.replace(/[{}]/g, "");
  // First given char (after the surname) — used as the faint watermark
  const watermarkChar =
    cleanHanzi.length > 1 ? cleanHanzi.charAt(1) : cleanHanzi.charAt(0);

  const sourceStr = name.culturalHeritage?.source ?? "";
  const { author, dynasty } = parseSource(sourceStr);
  const poemLine = name.culturalHeritage?.original ?? "";
  const segments = segmentPoem(poemLine, name.hanzi);

  const openModal = async () => {
    setOpen(true);
    // Start QR generation immediately so it is ready by capture time.
    // Failures are silent — the card renders fine without a QR code.
    try {
      const url = await generateQrDataUrl(targetUrl);
      setQrDataUrl(url);
    } catch {
      /* intentionally silent */
    }
  };

  const capture = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const { toPng } = await import("html-to-image");
    // CJK google fonts are served as unicode-range slices; the browser only
    // fetches the slices it actually needs, so they may not be cached yet when
    // the modal first opens. document.fonts.ready waits for the document's
    // FontFaceSet; the explicit load() triggers the Ma Shan Zheng slice for
    // cleanHanzi so it is rasterized correctly in the PNG.
    await document.fonts.ready;
    await document.fonts
      .load('1rem "Ma Shan Zheng"', cleanHanzi)
      .catch(() => {});
    const dataUrl = await toPng(cardRef.current, {
      pixelRatio: 3, // 3x -> 990x1320; crisp on retina social feeds
      cacheBust: true,
      backgroundColor: "#FDFBF7",
    });
    return (await fetch(dataUrl)).blob();
  };

  const downloadBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cleanHanzi}-harmonyname.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await capture();
      if (blob) downloadBlob(blob);
      else setError("Couldn't create the image. Please try again.");
    } catch {
      setError("Couldn't create the image. Please try again.");
    } finally {
      setBusy(false);
    }
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
      const file = new File([blob], `${cleanHanzi}-harmonyname.png`, {
        type: "image/png",
      });
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `My Chinese name: ${cleanHanzi}`,
          text: `${cleanHanzi} (${name.pinyin}) — my Chinese name, found in a real classical poem. Every character traced to its line ✦`,
          url: targetUrl,
        });
      } else {
        // Desktop: download the PNG; user posts it manually
        downloadBlob(blob);
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return; // user cancelled
      if (blob) downloadBlob(blob);
      else setError("Couldn't share. Please try Save image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {label ? (
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-full border border-gold-soft bg-paper-raised px-6 py-3 text-sm font-semibold text-gold shadow-soft transition-soft hover:shadow-soft-lifted active:scale-[0.98]"
        >
          <Share2 className="w-4 h-4" /> {label}
        </button>
      ) : (
        <button
          onClick={openModal}
          aria-label="Share this name"
          className="hover:text-stone-800 cursor-pointer transition-soft"
        >
          <Share2 className="w-5 h-5" />
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-auto"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex flex-col items-center gap-4 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ===== Capture target: 3:4 portrait card (330x440) ===== */}
            <div
              ref={cardRef}
              className="w-[330px] h-[440px] bg-paper flex flex-col items-center justify-between px-7 py-8 text-ink relative overflow-hidden"
            >
              {/* Faint watermark — first given char in brush at 10rem */}
              <div
                className="absolute -right-8 top-6 font-brush leading-none select-none pointer-events-none"
                style={{ fontSize: "10rem", color: "rgba(28,25,23,0.045)" }}
                aria-hidden
                lang="zh-Hans"
              >
                {watermarkChar}
              </div>

              {/* Header */}
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink-faint">
                ✦ HARMONYNAME
              </div>

              {/* Center block */}
              <div className="flex flex-col items-center text-center">
                {/* Name in Ma Shan Zheng brush font */}
                <div
                  className="font-brush leading-none mb-2"
                  style={{ fontSize: "5.5rem" }}
                  lang="zh-Hans"
                >
                  {cleanHanzi}
                </div>

                {/* Pinyin */}
                <div className="text-sm tracking-[0.2em] text-ink-soft mb-5 font-serif">
                  {name.pinyin}
                </div>

                {/* Poem line — given-name chars in seal-red.
                    Using inline style for color so Tailwind purge does not
                    remove the class from the DOM-captured node. */}
                {poemLine && segments.length > 0 && (
                  <div
                    className="font-hanzi text-lg leading-relaxed mb-2"
                    lang="zh-Hans"
                  >
                    {segments.map(({ char, highlighted, isPunctuation }: PoemSegment, i: number) => {
                      if (isPunctuation) return <span key={i}>{char}</span>;
                      if (highlighted) {
                        return (
                          <span
                            key={i}
                            style={{ color: "#9e2b25", fontWeight: 700 }}
                          >
                            {char}
                          </span>
                        );
                      }
                      return <span key={i}>{char}</span>;
                    })}
                  </div>
                )}

                {/* Translation */}
                {name.culturalHeritage?.translation && (
                  <p
                    className="italic text-ink-soft leading-relaxed font-serif"
                    style={{
                      fontSize: "12px",
                      marginTop: "4px",
                      maxWidth: "260px",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    &ldquo;{name.culturalHeritage.translation}&rdquo;
                  </p>
                )}

                {/* Museum tombstone: poet · dynasty */}
                {author && (
                  <p
                    className="text-ink-faint font-serif"
                    style={{ fontSize: "10px", marginTop: "8px" }}
                  >
                    <span className="font-hanzi" lang="zh-Hans">
                      {author}
                    </span>
                    {dynasty ? ` · ${dynasty}` : ""}
                  </p>
                )}
              </div>

              {/* Footer row: brand text left, QR code right */}
              <div className="flex items-end justify-between w-full">
                <div className="flex flex-col items-start gap-1">
                  {archetype && (
                    <div
                      className="font-bold uppercase tracking-[0.18em] text-gold"
                      style={{ fontSize: "10px" }}
                    >
                      {archetype.title} · {archetype.subtitle}
                    </div>
                  )}
                  <div
                    className="uppercase tracking-[0.25em] text-ink-faint"
                    style={{ fontSize: "9px" }}
                  >
                    Every name lives in a poem · harmonyname.com
                  </div>
                </div>

                {/* QR: ink-on-paper palette, ~96px display, 256px internal res.
                    quiet-zone (margin:1) included in the 256px data URL.
                    imageRendering:pixelated avoids blur when scaled in the PNG. */}
                {qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="Scan to open this name"
                    width={96}
                    height={96}
                    style={{ imageRendering: "pixelated", flexShrink: 0 }}
                  />
                )}
              </div>
            </div>

            {/* ===== Action buttons (outside the captured card) ===== */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-stone-900 text-white px-5 py-3 rounded-full font-semibold text-sm hover:bg-stone-800 active:scale-95 transition disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" /> {busy ? "Preparing…" : "Share"}
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="inline-flex items-center gap-2 bg-white text-stone-700 border border-stone-200 px-5 py-3 rounded-full font-semibold text-sm hover:bg-stone-50 active:scale-95 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Save image
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="inline-flex items-center justify-center w-11 h-11 bg-white/90 text-stone-600 border border-stone-200 rounded-full hover:bg-white active:scale-95 transition"
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

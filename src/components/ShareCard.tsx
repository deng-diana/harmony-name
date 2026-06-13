"use client";

/**
 * 分享卡 (6.1) —— 增长引擎
 * ========================
 * 点 Share → 弹出一张为社交平台(IG/TikTok/小红书)设计的竖版卡片预览,
 * 用 html-to-image 把这张卡片 DOM 截成 PNG:
 *   - 手机(支持 Web Share API 分享文件)→ 调起原生分享面板
 *   - 否则 → 直接下载 PNG,用户自己去发
 *
 * 为什么截图成 PNG:社交平台是"发图"的场景,一张漂亮的图远比一个链接更易传播。
 */
import { useRef, useState } from "react";
import { Share2, Download, X } from "lucide-react";
import type { NameOption } from "@/types";

interface Archetype {
  title: string;
  subtitle: string;
}

export function ShareNameButton({
  name,
  archetype,
}: {
  name: NameOption;
  archetype?: Archetype;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cleanHanzi = name.hanzi.replace(/[{}]/g, "");

  const capture = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    // 动态 import: 仅在用户点分享/保存时才加载,不进首屏 bundle
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(cardRef.current, {
      pixelRatio: 2, // 2x 分辨率,发出去更清晰
      cacheBust: true,
      backgroundColor: "#FDFBF7",
    });
    const res = await fetch(dataUrl);
    return res.blob();
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
      // 支持的浏览器(多为手机):原生分享面板
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `My Chinese name: ${cleanHanzi}`,
          text: `${cleanHanzi} (${name.pinyin}) — my authentic Chinese name ✦`,
        });
      } else {
        // 桌面端不支持分享文件 → 直接下载图片
        downloadBlob(blob);
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return; // 用户主动取消
      // 分享失败(如手势已过期)→ 退化为下载,保证有结果
      if (blob) downloadBlob(blob);
      else setError("Couldn't share. Please try Save image.");
    } finally {
      setBusy(false);
    }
  };

  const sourceTitle = name.culturalHeritage?.source ?? "";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Share this name"
        className="hover:text-stone-800 cursor-pointer transition-soft"
      >
        <Share2 className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-auto"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex flex-col items-center gap-4 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ===== 截图目标: 竖版分享卡 (3:4) ===== */}
            <div
              ref={cardRef}
              className="w-[330px] h-[440px] bg-[#FDFBF7] flex flex-col items-center justify-between px-8 py-9 text-stone-900 shadow-2xl"
              style={{ fontFamily: "Lora, Georgia, serif" }}
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-stone-400">
                ✦ HarmonyName
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="text-7xl tracking-tight leading-none mb-3">
                  {cleanHanzi}
                </div>
                <div className="text-base text-stone-500 tracking-wide mb-5">
                  {name.pinyin}
                </div>
                <p className="text-[13px] italic text-stone-700 leading-relaxed line-clamp-3 px-1">
                  &ldquo;{name.poeticMeaning}&rdquo;
                </p>
                {sourceTitle && (
                  <div className="mt-3 text-[10px] uppercase tracking-wider text-stone-400">
                    {sourceTitle}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center text-center w-full">
                {archetype && (
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 mb-3">
                    {archetype.title} · {archetype.subtitle}
                  </div>
                )}
                <div className="w-10 h-px bg-stone-300 mb-3" />
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-400">
                  Discover your name · harmonyname.ai
                </div>
              </div>
            </div>

            {/* ===== 操作按钮 ===== */}
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

"use client";

import { Volume2 } from "lucide-react";
import type { NameOption } from "@/types";
import { renderPoem } from "@/lib/render-poem";

interface NameCardProps {
  name: NameOption;
  index: number;
  playingNameIndex: number | null;
  onPlayName: (hanzi: string, index: number) => void;
}

export function NameCard({
  name,
  index,
  playingNameIndex,
  onPlayName,
}: NameCardProps) {
  const cleanHanzi = name.hanzi.replace(/[{}]/g, "");

  return (
    <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-stone-200 hover:shadow-xl transition-all duration-500 relative overflow-hidden group">
      <div className="absolute -right-12 -top-12 text-[12rem] font-serif text-stone-50 opacity-50 select-none pointer-events-none group-hover:text-stone-100 transition-colors">
        {cleanHanzi.charAt(0)}
      </div>

      <div className="relative z-10">
        <div className="mb-8 text-left">
          <h3 className="text-6xl md:text-7xl font-serif text-stone-900 tracking-tight mb-3 leading-none">
            {cleanHanzi}
          </h3>
          <div className="flex items-center gap-3 text-stone-500">
            <span className="text-xl font-medium tracking-wide font-serif">
              {name.pinyin}
            </span>
            <button
              onClick={() => onPlayName(name.hanzi, index)}
              className={`transition-all ${
                playingNameIndex === index
                  ? "text-stone-900 animate-pulse"
                  : "hover:text-stone-800 cursor-pointer"
              }`}
              aria-label="Play name pronunciation"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-6">
            <p className="text-lg md:text-xl text-stone-800 font-serif italic leading-relaxed">
              &ldquo;{name.poeticMeaning}&rdquo;
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-10 pt-8 border-t border-stone-100">
          <div>
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              Cultural Heritage
            </h4>
            <div className="bg-[#FFFCF5] p-5 rounded-xl border border-stone-100">
              <p className="text-stone-800 font-serif text-lg mb-2 leading-relaxed">
                {renderPoem(
                  name.culturalHeritage?.original || "",
                  name.hanzi
                )}
              </p>
              <p className="text-sm text-stone-500 italic mb-3 border-l-2 border-stone-300 pl-3">
                &ldquo;{name.culturalHeritage?.translation}&rdquo;
              </p>
              <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wide">
                Source: {name.culturalHeritage?.source}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
              The Anatomy
            </h4>
            <div className="space-y-4">
              {name.anatomy?.map((char, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-stone-900 text-white rounded-lg flex items-center justify-center font-serif text-lg flex-shrink-0">
                    {char.char}
                  </div>
                  <div className="flex-1 flex items-center text-sm text-stone-800">
                    <span className="text-stone-700">{char.meaning}</span>
                  </div>
                  <div className="text-[10px] font-bold px-2.5 py-1 bg-stone-100 text-stone-500 rounded-full border border-stone-200 flex-shrink-0">
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

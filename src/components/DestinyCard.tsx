import { CloudSun, Scale } from "lucide-react";
import type { BaziResult } from "@/lib/bazi";
import { ARCHETYPES } from "@/lib/bazi";
import { FiveElementsChart } from "./FiveElementsChart";
import { HighlightText } from "./HighlightText";

const ICON_MAP = [CloudSun, Scale];

export function DestinyCard({ baziResult }: { baziResult: BaziResult }) {
  const archetype =
    ARCHETYPES[baziResult.dayMaster as keyof typeof ARCHETYPES];

  return (
    <section className="bg-white rounded-3xl shadow-xl border border-stone-100 overflow-hidden">
      <div className="bg-stone-900 p-8 md:p-10 text-white text-center">
        <p className="text-amber-500/90 text-xs font-bold uppercase tracking-[0.2em] mb-3">
          {archetype.subtitle}
        </p>
        <h2 className="text-3xl md:text-4xl font-serif font-medium text-stone-50 mb-4">
          {archetype.title}
        </h2>
        <p className="text-stone-300 max-w-2xl mx-auto leading-relaxed text-base md:text-lg font-light opacity-90">
          {archetype.desc}
        </p>
      </div>

      <div className="p-8 md:p-10 grid md:grid-cols-5 gap-10 items-start">
        <div className="md:col-span-2 flex flex-col items-center justify-center">
          <FiveElementsChart
            wuxing={baziResult.wuxing}
            dayMaster={baziResult.dayMaster}
          />
        </div>
        <div className="md:col-span-3 flex flex-col space-y-6 justify-center">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-xs font-bold text-stone-400 uppercase mb-2 tracking-wider">
              Your Core Element
            </p>
            <div className="text-2xl font-serif text-stone-900 mb-2">
              {baziResult.coreExplanation.title}
            </div>
            <p className="text-sm text-stone-500 leading-relaxed mb-6">
              Defined by the Heavenly Stem of your birth day — the element that
              represents your core nature.
            </p>

            <div className="bg-stone-50 rounded-xl border border-stone-100 overflow-hidden">
              {baziResult.coreExplanation.points.map((point, i) => {
                const Icon = ICON_MAP[i] ?? CloudSun;
                return (
                  <div
                    key={i}
                    className="p-4 border-b border-stone-100 last:border-0 flex gap-3 items-start"
                  >
                    <div className="mt-0.5 text-stone-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-stone-900 uppercase tracking-wide block mb-1">
                        {point.label}
                      </span>
                      <p className="text-sm text-stone-600 leading-relaxed">
                        <HighlightText text={point.content} />
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

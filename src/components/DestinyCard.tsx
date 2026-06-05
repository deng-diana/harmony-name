import { CloudSun } from "lucide-react";
import type { BaziResult } from "@/lib/bazi";
import { ARCHETYPES } from "@/lib/bazi";
import { ELEMENTS, type Element } from "@/lib/elements";
import { FiveElementsChart } from "./FiveElementsChart";
import { HighlightText } from "./HighlightText";
import { ShareElementButton } from "./ElementShareCard";
import { ElementCompatibility } from "./ElementCompatibility";

export function DestinyCard({ baziResult }: { baziResult: BaziResult }) {
  const dayMaster = baziResult.dayMaster;
  const archetype = ARCHETYPES[dayMaster as keyof typeof ARCHETYPES];
  const glyph = ELEMENTS[dayMaster as Element]?.archetypeGlyph ?? "✦";
  const fav = baziResult.favourableElements;

  // 季节能量(coreExplanation 的第一条),其余改由"You flow toward"承接
  const seasonal = baziResult.coreExplanation.points.find((p) =>
    /season/i.test(p.label)
  );

  const favLabel = fav
    .map((e) => `${ELEMENTS[e as Element]?.emoji ?? ""} ${e}`)
    .join(" & ");

  return (
    <section className="bg-white rounded-3xl shadow-xl border border-stone-100 overflow-hidden">
      {/* ===== HERO:元素身份 ===== */}
      <div className="bg-stone-900 p-8 md:p-10 text-white text-center">
        <div className="text-6xl mb-3 leading-none">{glyph}</div>
        <p className="text-amber-500/90 text-xs font-bold uppercase tracking-[0.2em] mb-3">
          {archetype.subtitle}
        </p>
        <h2 className="text-3xl md:text-4xl font-serif font-medium text-stone-50 mb-4">
          {archetype.title}
        </h2>
        <p className="text-stone-300 max-w-2xl mx-auto leading-relaxed text-base md:text-lg font-light opacity-90 mb-6">
          {archetype.desc}
        </p>
        <ShareElementButton
          dayMaster={dayMaster}
          archetype={archetype}
          favourableElements={fav}
        />
      </div>

      <div className="p-8 md:p-10 grid md:grid-cols-5 gap-10 items-start">
        <div className="md:col-span-2 flex flex-col items-center justify-center">
          <FiveElementsChart wuxing={baziResult.wuxing} dayMaster={dayMaster} />
        </div>

        <div className="md:col-span-3 flex flex-col space-y-6 justify-center">
          {/* Core element + seasonal energy */}
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase mb-2 tracking-wider">
              Your Core Element
            </p>
            <div className="text-2xl font-serif text-stone-900 mb-2">
              {baziResult.coreExplanation.title}
            </div>
            {seasonal && (
              <div className="bg-stone-50 rounded-xl border border-stone-100 p-4 flex gap-3 items-start">
                <CloudSun className="w-4 h-4 mt-0.5 text-stone-400 shrink-0" />
                <p className="text-sm text-stone-600 leading-relaxed">
                  <HighlightText text={seasonal.content} />
                </p>
              </div>
            )}
          </div>

          {/* ===== YOU FLOW TOWARD —— 把"喜用神"变成可感的身份/能量 ===== */}
          {fav.length > 0 && (
            <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-orange-50/40 p-5">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">
                You flow toward {favLabel}
              </p>
              <ul className="space-y-2 mb-4">
                {fav.map((e) => {
                  const t = ELEMENTS[e as Element];
                  if (!t) return null;
                  return (
                    <li key={e} className="text-sm text-stone-700 leading-relaxed">
                      <span className="mr-1.5">{t.emoji}</span>
                      <span className="font-semibold">{e}</span> — {t.essence}.
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-stone-500 italic leading-relaxed">
                ✦ In the ancient Five-Element cycle, energy flows from one to the
                next — {fav.join(" & ")} are where your {dayMaster} nature
                naturally flows.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===== 五族 + 相性:chip 行抛出"谁是你的朋友?",下方相性区块给出答案 ===== */}
      <div className="px-8 md:px-10 pb-8">
        <p className="text-[11px] text-stone-400 uppercase tracking-wider text-center mb-3">
          The five tribes — which are your friends?
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {(Object.keys(ELEMENTS) as Element[]).map((el) => {
            const a = ARCHETYPES[el as keyof typeof ARCHETYPES];
            const isYou = el === dayMaster;
            return (
              <span
                key={el}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition ${
                  isYou
                    ? "bg-stone-900 text-white border-stone-900 font-semibold"
                    : "bg-white text-stone-500 border-stone-200"
                }`}
              >
                <span>{ELEMENTS[el].archetypeGlyph}</span>
                {a.title.replace(/^The\s+/, "")}
                {isYou && <span className="text-amber-400">· you</span>}
              </span>
            );
          })}
        </div>

        <ElementCompatibility
          dayMaster={dayMaster}
          favourableElements={baziResult.favourableElements}
          avoidElements={baziResult.avoidElements}
        />
      </div>
    </section>
  );
}

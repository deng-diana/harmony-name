import { ARCHETYPES } from "@/lib/bazi";
import { ELEMENTS, type Element } from "@/lib/elements";
import {
  computeCompatibility,
  type Energy,
  type Relation,
} from "@/lib/compatibility";

/**
 * "Who you vibe with" —— 把五行相生相克翻译成"你和谁最合拍"。
 * 双轴:关系性质(纯生克,人人相同) × 能量损益(由本人喜忌查表)。所有英文文案集中在本文件。
 */

// 轴一:关系性质 → 标签 + 一句意象(落点经国学大师校准:食伤="我"输出、财=经营而非掌控)。
const RELATION_COPY: Record<Relation, { label: string; line: string }> = {
  nourisher: {
    label: "The Nourisher",
    line: "They pour energy into you — around them you feel supported and replenished.",
  },
  protege: {
    label: "The Protégé",
    line: "You naturally give to them — they draw out your warmth, ideas, and creativity.",
  },
  kindred: {
    label: "The Kindred",
    line: "Same wavelength — they get you without effort, with a little friendly rivalry.",
  },
  challenger: {
    label: "The Challenger",
    line: "They raise the bar and keep you sharp — friction that forges growth.",
  },
  cultivator: {
    label: "The Cultivator",
    line: "You take the lead and make things happen — you feel capable and resourceful.",
  },
};

// 轴二:能量损益 chip。costs 用琥珀色而非红色 —— 不渲染"凶"。Balanced 时整体降调。
function energyChip(energy: Energy, isBalanced: boolean) {
  const map: Record<Energy, { text: string; soft: string; cls: string }> = {
    lifts: {
      text: "Lifts you",
      soft: "Lightly lifts",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    easy: {
      text: "Easy",
      soft: "Easy",
      cls: "bg-stone-50 text-stone-500 border-stone-200",
    },
    costs: {
      text: "Costs you",
      soft: "Asks a little",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
    },
  };
  const m = map[energy];
  return { label: isBalanced ? m.soft : m.text, cls: m.cls };
}

const tribeName = (el: Element) =>
  ARCHETYPES[el as keyof typeof ARCHETYPES].title.replace(/^The\s+/, "");

export function ElementCompatibility({
  dayMaster,
  favourableElements,
  avoidElements,
}: {
  dayMaster: string;
  favourableElements: string[];
  avoidElements: string[];
}) {
  const compat = computeCompatibility({
    dayMaster,
    favourableElements,
    avoidElements,
  });
  const { tribes, isBalanced, bestElement, foilElement } = compat;

  const named = (el: Element | null) =>
    el ? `${ELEMENTS[el].emoji} ${tribeName(el)}` : "";

  // 顶部金句 —— 不用 "clash/相克",措辞随平衡局软化。
  let summary: string;
  if (isBalanced) {
    summary = `Your elements run balanced — you sit easy with most tribes, with a little extra warmth from ${named(
      bestElement
    )} and a touch of spark from ${named(foilElement)}.`;
  } else {
    summary = `You're most lifted by ${named(
      bestElement
    )}, and most challenged by ${named(foilElement)}.`;
  }

  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-white p-5 md:p-6">
      {/* 金句 */}
      <p className="text-sm md:text-base font-serif text-stone-800 leading-relaxed mb-5">
        {summary}
      </p>

      {/* 五族双轴列表 */}
      <ul className="space-y-3">
        {tribes.map((t) => {
          const rc = RELATION_COPY[t.relation];
          const chip = energyChip(t.energy, isBalanced);
          return (
            <li
              key={t.element}
              className="flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-xl leading-none mt-0.5 shrink-0">
                  {ELEMENTS[t.element].archetypeGlyph}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-stone-800">
                    <span className="font-semibold">{tribeName(t.element)}</span>
                    <span className="text-stone-400"> · </span>
                    <span className="text-amber-700">{rc.label}</span>
                    {t.isBestMatch && (
                      <span className="ml-1.5 text-amber-600 font-semibold whitespace-nowrap">
                        ✦ {isBalanced ? "Most in tune" : "Best match"}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-stone-500 leading-relaxed mt-0.5">
                    {rc.line}
                  </p>
                </div>
              </div>
              <span
                className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border ${chip.cls}`}
              >
                {chip.label}
              </span>
            </li>
          );
        })}
      </ul>

      {/* 单边视角 —— 诚实交代 + 社交钩子 */}
      <p className="text-xs text-stone-500 italic leading-relaxed mt-5">
        ✦ This is the view from <span className="font-medium">your</span> chart —
        how you&apos;d land in someone else&apos;s is its own story.
      </p>

      {/* 免责声明(克制、得体,不让人觉得"全是假的") */}
      <p className="text-[11px] text-stone-400 leading-relaxed mt-2">
        Read this as the <em>energetic undertone</em> between you and each
        element — drawn from just your core day-element, a playful, stripped-down
        take on classical Chinese compatibility. Real people are a whole chart,
        far richer than one element — two &ldquo;Fire&rdquo; souls can be worlds
        apart. Trust it a little, smile, and let real life decide the rest. 🌱
      </p>
    </div>
  );
}

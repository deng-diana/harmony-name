import { ARCHETYPES } from "@/lib/bazi";
import { ELEMENTS, type Element } from "@/lib/elements";
import { SITE_HOST } from "@/lib/site";
import {
  computeCompatibility,
  type Energy,
  type Relation,
} from "@/lib/compatibility";

/**
 * ElementCompatibility — "how the five elements move around you"
 *
 * Museum-redesign (2026-07-05): always visible (no accordion), story-first,
 * screenshot-shareable. Writer's exact RELATION_COPY and INTRO verbatim.
 * Energy chips re-tokenised to on-palette design tokens.
 */

// ── RELATION COPY (writer spec verbatim — 2026-07-05) ──────────────────────
// headline = bold second line under the tribe name
// story = template; {tribe} = tribeName(element) + " people" e.g. "Flame people"
const RELATION_COPY: Record<Relation, { label: string; headline: string; story: string }> = {
  nourisher: {
    label: "The Nourisher",
    headline: "They rain on your garden.",
    story:
      "You and {tribe} fit the way rain fits a garden: they pour in, and you grow. When you’re running on empty, these are the ones who somehow leave you fuller than they found you.",
  },
  protege: {
    label: "The Protégé",
    headline: "You’re the rain in this one.",
    story:
      "With {tribe}, the current runs from you to them — your ideas, your warmth, your best advice. Notice how alive you feel around them: giving them your light is one of the ways you shine.",
  },
  kindred: {
    label: "The Kindred",
    headline: "Same weather, same wavelength.",
    story:
      "You and {tribe} are cut from the same cloth, so nothing needs explaining — you can be quiet together and still be in conversation. Two of a kind will sometimes race each other; kept friendly, the race makes you both faster.",
  },
  challenger: {
    label: "The Challenger",
    headline: "The whetstone.",
    story:
      "{tribe} push against you by nature — they question the plan, hold their ground, raise the bar. It costs a little energy, and it’s also exactly how a blade gets sharp.",
  },
  cultivator: {
    label: "The Cultivator",
    headline: "You hold the tools here.",
    story:
      "With {tribe}, you’re the one shaping things — you set the direction, they give you something real to work with. It’s where you feel most capable; just garden it gently. Good gardeners tend, they never trample.",
  },
};

// ── INTRO (writer spec verbatim) ────────────────────────────────────────────
const INTRO =
  "The five elements move in a circle: each one feeds a neighbor, and each one keeps a neighbor in check — the way rain feeds a pine, and a riverbank holds the river. Neither is bad. Feeding is how things grow; checking is how things take shape. Your chart shows where each kind of person stands on your circle.";

// ── ENERGY CHIPS (on-palette tokens) ───────────────────────────────────────
function energyChip(energy: Energy, isBalanced: boolean) {
  const map: Record<
    Energy,
    { text: string; soft: string; cls: string }
  > = {
    lifts: {
      text: "Recharges you",
      soft: "Gently lifts",
      cls: "border-gold-soft bg-gold-soft/15 text-gold",
    },
    easy: {
      text: "Easy company",
      soft: "Easy company",
      cls: "border-mist text-ink-soft",
    },
    costs: {
      text: "Costs you energy",
      soft: "Asks a little",
      cls: "border-seal/30 text-seal-soft bg-seal/5",
    },
  };
  const m = map[energy];
  return { label: isBalanced ? m.soft : m.text, cls: m.cls };
}

const tribeName = (el: Element) =>
  ARCHETYPES[el as keyof typeof ARCHETYPES].title.replace(/^The\s+/, "");

const tribePeople = (el: Element) => `${tribeName(el)} people`;

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

  const namedEl = (el: Element | null) =>
    el ? `${ELEMENTS[el].hanzi} ${tribeName(el)}` : "";

  // Summary sentence above the list
  let summary: string;
  if (isBalanced) {
    summary = `Your elements run balanced — you sit easy with most tribes, with a little extra warmth from ${namedEl(bestElement)} and a touch of spark from ${namedEl(foilElement)}.`;
  } else {
    summary = `You’re most lifted by ${namedEl(bestElement)}, and most challenged by ${namedEl(foilElement)}.`;
  }

  return (
    <section className="rounded-2xl border border-mist/70 bg-paper-raised p-6 md:p-7">
      {/* Section heading */}
      <h3 className="font-serif text-lg text-ink mb-1">
        How the five elements move around you
      </h3>

      {/* Intro — the 相生相克 explainer (writer spec verbatim) */}
      <p className="text-sm text-ink-soft mb-4 leading-relaxed">{INTRO}</p>

      {/* Summary sentence */}
      <p className="text-sm md:text-base font-serif text-ink leading-relaxed mb-5">
        {summary}
      </p>

      {/* Five-tribe list */}
      <ul className="space-y-4">
        {tribes.map((t) => {
          const rc = RELATION_COPY[t.relation];
          const chip = energyChip(t.energy, isBalanced);
          const story = rc.story.replace("{tribe}", tribePeople(t.element));
          const elData = ELEMENTS[t.element];

          return (
            <li key={t.element} className="flex gap-3.5">
              {/* Brush element hanzi instead of emoji */}
              <span
                className="font-brush text-3xl leading-none text-ink w-9 shrink-0 text-center"
                lang="zh-Hans"
                aria-label={t.element}
              >
                {elData.hanzi}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <b>{tribeName(t.element)}</b>
                  <span className="text-ink-faint"> · </span>
                  <span className="text-gold">{rc.label}</span>
                  {t.isBestMatch && (
                    <span className="ml-1.5 text-gold font-semibold whitespace-nowrap">
                      ✦ {isBalanced ? "Most in tune" : "Best match"}
                    </span>
                  )}
                </p>
                {/* Headline in bold, then story in smaller text */}
                <p className="text-sm font-medium text-ink mt-0.5">{rc.headline}</p>
                <p className="text-sm text-ink-soft leading-relaxed mt-0.5">{story}</p>
              </div>

              {/* On-palette energy chip */}
              <span
                className={`shrink-0 self-start inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border ${chip.cls}`}
              >
                {chip.label}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Single-perspective disclaimer — keep, drop plant emoji */}
      <p className="text-xs text-ink-soft italic leading-relaxed mt-5">
        This is the view from <span className="font-medium">your</span> chart
        — how you&apos;d land in someone else&apos;s is its own story.
      </p>

      <p className="text-[11px] text-ink-faint leading-relaxed mt-2">
        Read this as the <em>energetic undertone</em> between you and each
        element — drawn from just your core day-element, a playful, stripped-down
        take on classical Chinese compatibility. Real people are a whole chart,
        far richer than one element — two &ldquo;Fire&rdquo; souls can be worlds
        apart. Trust it a little, smile, and let real life decide the rest.
      </p>

      {/* Attribution whisper for screenshots */}
      <div className="text-center text-[10px] tracking-[0.25em] uppercase text-ink-faint pt-5">
        ✦ {SITE_HOST}
      </div>
    </section>
  );
}

import Link from "next/link";
import Image from "next/image";
import { ScrollAnimator } from "@/components/ScrollAnimator";
import { StickyHeader } from "@/components/StickyHeader";
import { NameCard } from "@/components/NameCard";
import type { NameOption } from "@/types";

/**
 * A real, production-verified example (prod eval, citation 100%):
 * the given character 皎 genuinely appears in the cited Tang line 「皎皎白林秋」.
 * We never invent the poem — this is the whole point of the product, so the
 * landing page must use a REAL one, not a decorative fake.
 */
const SAMPLE_NAME: NameOption = {
  hanzi: "张皎",
  pinyin: "Zhāng Jiǎo",
  poeticMeaning:
    "Bright and clear as moonlight — a calm, luminous presence that holds its own in any season.",
  culturalHeritage: {
    source: "《酬殷上人秋夜山亭有赠》— 陈子昂 (Tang Dynasty)",
    original: "{皎}皎白林秋",
    translation: "Luminous and pale — the white grove in autumn.",
  },
  anatomy: [
    {
      char: "张",
      pinyin: "Zhāng",
      meaning: "An old, storied surname — to draw open, as one draws a bow.",
      type: "Surname",
      element: "Fire",
    },
    {
      char: "皎",
      pinyin: "Jiǎo",
      meaning: "Bright, clear, luminous — especially of moonlight.",
      type: "Given Name",
      element: "Metal",
    },
  ],
  masterComment:
    "皎 lends a quiet brilliance — refined, self-possessed, never loud.",
};

// PILLARS — writer spec verbatim (2026-07-05). Glyphs unchanged; copy rewritten
// so each title is a promise, not a description; "by code, not by trust" replaces
// "no hallucinations" (insider jargon); "and they will" plants the social moment.
const PILLARS = [
  {
    glyph: "真",
    title: "Found in a poem, never made up",
    desc: 'Our system can quote a poem, but it can never write one. Every character in your name is checked — by code, not by trust — against a real classical line, and we show you the line, the poet, and the dynasty.',
  },
  {
    glyph: "時",
    title: "Timed to the hour you were born",
    desc: "We build your Four Pillars (Bāzì) chart with true solar time for your exact birthplace — the sun's real position, not the clock on the wall — then read your Five-Element balance to choose characters that genuinely fit you.",
  },
  {
    glyph: "解",
    title: "A name you can stand behind",
    desc: "Every character comes explained: its meaning, its sound, its element, and the line it was found in. When someone asks about your name — and they will — you'll have the story.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Tell us when & where you were born",
    desc: "Just your birth date, time, and city — enough to read your chart with true solar time.",
  },
  {
    step: "2",
    title: "We read your chart and the classics",
    desc: "We map your Five Elements, then search thousands of lines of classical Chinese poetry for characters that fit.",
  },
  {
    step: "3",
    title: "You get three names, fully sourced",
    desc: "Each with its poem, meaning, pronunciation, and element — ready to say out loud.",
  },
];

// Thin centred hairline ornament between sections — the Met's printer's-ornament move.
function SectionRule() {
  return (
    <div className="mx-auto h-px w-12 bg-gold-soft/70" aria-hidden />
  );
}

export default function LandingPage() {
  return (
    <ScrollAnimator>
      <StickyHeader />

      {/* ===== Hero — ink-landscape image; keep H1 verbatim (writer: KEEP) ===== */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-bg.png"
            alt="Ink landscape"
            fill
            className="object-cover object-bottom opacity-90"
            priority
          />
          {/* Soft warm scrim — keeps dark text readable over the painting */}
          <div className="absolute inset-0 bg-gradient-to-b from-paper-warm/70 via-paper-warm/30 to-transparent" />
        </div>

        {/* Vertical brush wordmark — right edge, desktop only; 知命得名 */}
        <div
          className="hidden md:block absolute right-8 top-28 font-brush text-5xl text-ink/70 [writing-mode:vertical-rl] tracking-[0.3em]"
          aria-hidden
          lang="zh-Hans"
        >
          知命得名
        </div>

        <div className="relative z-10 max-w-2xl mx-auto text-center mt-[-6vh]">
          {/* H1 — writer says KEEP verbatim */}
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-ink leading-tight mb-6 animate-fade-in">
            A name that fits you — down to the hour you were born.
          </h1>

          {/* Subhead — writer spec verbatim */}
          <p className="text-lg md:text-xl text-ink-soft leading-relaxed max-w-xl mx-auto mb-10 animate-fade-in delay-100">
            We read your Four Pillars (Bāzì) — the traditional Chinese birth
            chart — then find your name inside a real line of classical poetry.
            Poem, poet, and dynasty included.
          </p>

          <div className="animate-fade-in delay-200">
            <Link href="/app">
              {/* Button: bg-ink + quiet-lift hover — SaaS scale/shadow removed */}
              <button className="px-8 py-4 bg-ink text-paper text-lg rounded-full font-bold hover:-translate-y-0.5 transition-soft shadow-soft-lifted">
                Find my name
              </button>
            </Link>
            <p className="text-sm text-ink-soft mt-4">
              3 names free · no card needed
            </p>
          </div>
        </div>
      </section>

      <SectionRule />

      {/* ===== The ache — emotional resonance ===== */}
      <section className="py-24 px-4 bg-paper">
        <div className="max-w-2xl mx-auto scroll-animate">
          <p className="text-xs font-bold text-ink-faint uppercase tracking-widest mb-5">
            For the one who wants more than a translation
          </p>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink leading-snug mb-6">
            You don&apos;t want a label. You want a name.
          </h2>
          <p className="text-lg text-ink-soft leading-relaxed mb-4">
            Maybe you&apos;re learning the language. Maybe you&apos;ve fallen for
            the poetry, the calligraphy, the weight a single character can carry.
          </p>
          <p className="text-lg text-ink-soft leading-relaxed">
            You don&apos;t want a sound that roughly matches yours, or a word
            picked at random. You want a name that{" "}
            <span className="text-ink font-medium">means something</span> —
            one a Chinese friend would nod at, one you can stand behind for the
            rest of your life.
          </p>
        </div>
      </section>

      <SectionRule />

      {/* ===== See a real name — the artifact ===== */}
      <section id="real-name" className="py-24 px-4 bg-paper-warm">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 scroll-animate">
            <p className="text-xs font-bold text-ink-faint uppercase tracking-widest mb-4">
              Not a mockup
            </p>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink">
              Here&apos;s a name we actually generated.
            </h2>
          </div>

          <div className="scroll-animate">
            <NameCard name={SAMPLE_NAME} index={0} readOnly />
          </div>

          <div className="max-w-2xl mx-auto mt-8 scroll-animate">
            <p className="text-base text-ink-soft leading-relaxed">
              See{" "}
              <span className="text-seal font-bold font-hanzi" lang="zh-Hans">
                皎
              </span>{" "}
              highlighted? That character is verified to appear in that exact
              line — from{" "}
              <span className="font-hanzi" lang="zh-Hans">
                《酬殷上人秋夜山亭有赠》
              </span>{" "}
              by the Tang poet{" "}
              <span className="font-hanzi" lang="zh-Hans">
                陈子昂
              </span>
              . We never write the poem. We find your name{" "}
              <span className="text-ink font-medium">inside</span> one.
            </p>
            <p className="text-sm text-ink-faint mt-3">
              Each generation gives you three, fully explained.
            </p>
          </div>
        </div>
      </section>

      <SectionRule />

      {/* ===== What makes it real — 3 honest pillars (writer spec verbatim) ===== */}
      <section className="py-24 px-4 bg-paper">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink mb-14 text-center scroll-animate">
            What makes it real
          </h2>

          <div className="divide-y divide-mist">
            {PILLARS.map((p) => (
              <div
                key={p.glyph}
                className="flex gap-6 md:gap-10 py-8 first:pt-0 scroll-animate"
              >
                {/* Pillar glyph: brush font in gold-soft — the museum move */}
                <div
                  className="font-brush text-5xl md:text-6xl text-gold-soft leading-none shrink-0 select-none"
                  aria-hidden
                  lang="zh-Hans"
                >
                  {p.glyph}
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-serif font-bold text-ink mb-2">
                    {p.title}
                  </h3>
                  <p className="text-ink-soft leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionRule />

      {/* ===== How it works — 3 steps ===== */}
      <section className="py-24 px-4 bg-paper-warm">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink mb-14 text-center scroll-animate">
            How it works
          </h2>

          <div className="space-y-10">
            {STEPS.map((s) => (
              <div key={s.step} className="flex gap-5 items-start scroll-animate">
                <div className="w-10 h-10 rounded-full border border-mist text-ink-soft flex items-center justify-center font-serif text-lg shrink-0">
                  {s.step}
                </div>
                <div className="pt-1">
                  <h3 className="text-lg font-serif font-bold text-ink mb-1">
                    {s.title}
                  </h3>
                  <p className="text-ink-soft leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionRule />

      {/* ===== Cultural Section (Dark) — keep the ink-landscape visual ===== */}
      <section className="py-32 px-4 bg-ink text-paper text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/hero-bg.png')] bg-cover bg-center" />
        <div className="relative z-10 max-w-3xl mx-auto scroll-animate">
          <p className="text-xs font-bold text-gold/90 uppercase tracking-widest mb-5">
            A little gift along the way
          </p>
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
            Meet your Five-Element self
          </h2>
          <p className="text-lg md:text-xl text-paper/75 leading-relaxed max-w-2xl mx-auto mb-12">
            Your birth chart also reveals your elemental nature — are you a
            Nurturing Mountain, a Flowing River, a Radiant Flame? We&apos;ll show
            you your element, and the kinds of people you naturally click with.
          </p>

          {/* Brush hanzi chips — emojis removed (anti-museum signal) */}
          <div className="flex flex-wrap justify-center gap-2.5 text-sm">
            {[
              { hanzi: "木", label: "Resilient Pine" },
              { hanzi: "火", label: "Radiant Flame" },
              { hanzi: "土", label: "Nurturing Mountain" },
              { hanzi: "金", label: "Refined Sword" },
              { hanzi: "水", label: "Flowing River" },
            ].map((t) => (
              <span
                key={t.label}
                className="px-4 py-2 rounded-full border border-paper/20 text-paper/80"
              >
                <span className="font-brush text-lg mr-1.5" lang="zh-Hans">
                  {t.hanzi}
                </span>
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <SectionRule />

      {/* ===== Trust & pricing + closing CTA ===== */}
      <section className="py-24 px-4 bg-paper">
        <div className="max-w-xl mx-auto text-center scroll-animate">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink mb-6">
            Try it. The first three are on us.
          </h2>
          <p className="text-lg text-ink-soft leading-relaxed mb-2">
            Start with 3 names, free — no card needed. If a generation ever
            fails, the credit comes back automatically.
          </p>
          <p className="text-base text-ink-faint mb-10">
            Need more? Simple packs from $5.
          </p>

          <Link href="/app">
            <button className="px-8 py-4 bg-ink text-paper text-lg rounded-full font-bold hover:-translate-y-0.5 transition-soft shadow-soft-lifted">
              Find my name
            </button>
          </Link>

          <p className="text-xs text-ink-faint mt-8 leading-relaxed">
            A tool for inspiration and cultural exploration, not legal name
            advice.
          </p>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="bg-ink text-paper/50 py-16 px-4 border-t border-mist/20">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-6">
            <span className="text-2xl font-serif font-bold text-paper/80">
              HarmonyName
            </span>
          </div>
          <p className="max-w-md mx-auto text-sm mb-12 opacity-70 leading-relaxed">
            Authentic Chinese names, read from your birth chart and traced to
            real classical poetry.
          </p>
          <div className="text-xs flex flex-wrap justify-center gap-6 pt-8 border-t border-paper/10">
            <span>&copy; {new Date().getFullYear()} HarmonyName</span>
            <Link href="/privacy" className="hover:text-paper transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-paper transition-colors">
              Terms
            </Link>
            <Link href="/refund" className="hover:text-paper transition-colors">
              Refunds
            </Link>
          </div>
        </div>
      </footer>
    </ScrollAnimator>
  );
}

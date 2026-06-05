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

const PILLARS = [
  {
    glyph: "真",
    title: "Grounded in real poetry, never invented",
    desc: "Our system can quote a poem, but it can never write one. Every character in your name is checked — by code — against a real classical line, and we show you the poem, the poet, and the dynasty. No hallucinations, no made-up sources.",
  },
  {
    glyph: "時",
    title: "Read from your real birth chart",
    desc: "We calculate your Four Pillars (Bāzì) using true solar time for your exact birthplace — a detail most name generators skip — then read your Five-Element balance to choose characters that genuinely fit you.",
  },
  {
    glyph: "解",
    title: "A name you can actually understand",
    desc: "Each character comes explained: its meaning, its sound, its element, and the line it came from. You'll even meet your Five-Element self — and the kinds of people you naturally click with.",
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
    desc: "We map your Five Elements, then search 300,000+ lines of classical Chinese poetry for characters that fit.",
  },
  {
    step: "3",
    title: "You get three names, fully sourced",
    desc: "Each with its poem, meaning, pronunciation, and element — ready to say out loud.",
  },
];

export default function LandingPage() {
  return (
    <ScrollAnimator>
      <StickyHeader />

      {/* ===== Hero — new copy over the original ink-landscape image ===== */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-bg.png"
            alt="Ink landscape"
            fill
            className="object-cover object-bottom opacity-90"
            priority
          />
          {/* 极淡的米色柔化层,保证深色文字在山水图上始终清晰可读 */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#FBF3E1]/70 via-[#FBF3E1]/30 to-transparent" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto text-center mt-[-6vh]">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-stone-900 leading-tight mb-6 animate-fade-in">
            A name that fits you — down to the hour you were born.
          </h1>
          <p className="text-lg md:text-xl text-stone-700 leading-relaxed max-w-xl mx-auto mb-10 animate-fade-in delay-100">
            Read from your Four Pillars (Bāzì) and traced to a real line of
            classical poetry. Chosen for who you are, never invented.
          </p>

          <div className="animate-fade-in delay-200">
            <Link href="/app">
              <button className="px-8 py-4 bg-stone-900 text-white text-lg rounded-full font-bold hover:bg-stone-800 hover:scale-105 transition-all shadow-2xl">
                Find my name
              </button>
            </Link>
            <p className="text-sm text-stone-600 mt-4">
              3 names free · no card needed
            </p>
          </div>
        </div>
      </section>

      {/* ===== The ache — emotional resonance ===== */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-2xl mx-auto scroll-animate">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-5">
            For the one who wants more than a translation
          </p>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 leading-snug mb-6">
            You don&apos;t want a label. You want a name.
          </h2>
          <p className="text-lg text-stone-600 leading-relaxed mb-4">
            Maybe you&apos;re learning the language. Maybe you&apos;ve fallen for
            the poetry, the calligraphy, the weight a single character can carry.
          </p>
          <p className="text-lg text-stone-600 leading-relaxed">
            You don&apos;t want a sound that roughly matches yours, or a word
            picked at random. You want a name that{" "}
            <span className="text-stone-900 font-medium">means something</span> —
            one a Chinese friend would nod at, one you can stand behind for the
            rest of your life.
          </p>
        </div>
      </section>

      {/* ===== See a real name — the artifact ===== */}
      <section id="real-name" className="py-24 px-4 bg-[#FBF3E1]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 scroll-animate">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">
              Not a mockup
            </p>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900">
              Here&apos;s a name we actually generated.
            </h2>
          </div>

          <div className="scroll-animate">
            <NameCard name={SAMPLE_NAME} index={0} readOnly />
          </div>

          <div className="max-w-2xl mx-auto mt-8 scroll-animate">
            <p className="text-base text-stone-600 leading-relaxed">
              See <span className="text-red-700 font-bold">皎</span> in red? That
              character is verified to appear in that exact line — from{" "}
              <span className="font-serif">《酬殷上人秋夜山亭有赠》</span> by the
              Tang poet 陈子昂. We never write the poem. We find your name{" "}
              <span className="text-stone-900 font-medium">inside</span> one.
            </p>
            <p className="text-sm text-stone-400 mt-3">
              Each generation gives you three, fully explained.
            </p>
          </div>
        </div>
      </section>

      {/* ===== What makes it real — 3 honest pillars ===== */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mb-14 text-center scroll-animate">
            What makes it real
          </h2>

          <div className="divide-y divide-stone-200">
            {PILLARS.map((p) => (
              <div
                key={p.glyph}
                className="flex gap-6 md:gap-10 py-8 first:pt-0 scroll-animate"
              >
                <div
                  className="text-5xl md:text-6xl font-serif text-stone-300 leading-none shrink-0 select-none"
                  aria-hidden
                >
                  {p.glyph}
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-serif font-bold text-stone-900 mb-2">
                    {p.title}
                  </h3>
                  <p className="text-stone-600 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== How it works — 3 steps ===== */}
      <section className="py-24 px-4 bg-[#FBF3E1]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mb-14 text-center scroll-animate">
            How it works
          </h2>

          <div className="space-y-10">
            {STEPS.map((s) => (
              <div key={s.step} className="flex gap-5 items-start scroll-animate">
                <div className="w-10 h-10 rounded-full border border-stone-300 text-stone-700 flex items-center justify-center font-serif text-lg shrink-0">
                  {s.step}
                </div>
                <div className="pt-1">
                  <h3 className="text-lg font-serif font-bold text-stone-900 mb-1">
                    {s.title}
                  </h3>
                  <p className="text-stone-600 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Cultural Section (Dark) — keep the original refined visual ===== */}
      <section className="py-32 px-4 bg-stone-900 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/hero-bg.png')] bg-cover bg-center" />
        <div className="relative z-10 max-w-3xl mx-auto scroll-animate">
          <p className="text-xs font-bold text-amber-500/90 uppercase tracking-widest mb-5">
            A little gift along the way
          </p>
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
            Meet your Five-Element self
          </h2>
          <p className="text-lg md:text-xl text-stone-300 leading-relaxed max-w-2xl mx-auto mb-12">
            Your birth chart also reveals your elemental nature — are you a
            Nurturing Mountain, a Flowing River, a Radiant Flame? We&apos;ll show
            you your element, and the kinds of people you naturally click with.
          </p>

          <div className="flex flex-wrap justify-center gap-2.5 text-sm">
            {[
              "🌲 Resilient Pine",
              "🔥 Radiant Flame",
              "⛰️ Nurturing Mountain",
              "⚔️ Refined Sword",
              "🌊 Flowing River",
            ].map((t) => (
              <span
                key={t}
                className="px-4 py-2 rounded-full border border-stone-700 text-stone-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Trust & pricing + closing CTA ===== */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-xl mx-auto text-center scroll-animate">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mb-6">
            Try it. The first three are on us.
          </h2>
          <p className="text-lg text-stone-600 leading-relaxed mb-2">
            Start with 3 names, free — no card needed. If a generation ever
            fails, the credit comes back automatically.
          </p>
          <p className="text-base text-stone-500 mb-10">
            Need more? Simple packs from $5.
          </p>

          <Link href="/app">
            <button className="px-8 py-4 bg-stone-900 text-white text-lg rounded-full font-bold hover:bg-stone-800 hover:scale-105 transition-all shadow-2xl">
              Find my name
            </button>
          </Link>

          <p className="text-xs text-stone-400 mt-8 leading-relaxed">
            A tool for inspiration and cultural exploration, not legal name
            advice.
          </p>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="bg-stone-950 text-stone-400 py-16 px-4 border-t border-stone-800">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-6">
            <span className="text-2xl font-serif font-bold text-stone-200">
              HarmonyName
            </span>
          </div>
          <p className="max-w-md mx-auto text-sm mb-12 opacity-70 leading-relaxed">
            Authentic Chinese names, read from your birth chart and traced to
            real classical poetry.
          </p>
          <div className="text-xs flex flex-wrap justify-center gap-6 pt-8 border-t border-stone-800">
            <span>&copy; {new Date().getFullYear()} HarmonyName</span>
            <Link href="/privacy" className="hover:text-white transition">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition">
              Terms
            </Link>
            <Link href="/refund" className="hover:text-white transition">
              Refunds
            </Link>
          </div>
        </div>
      </footer>
    </ScrollAnimator>
  );
}

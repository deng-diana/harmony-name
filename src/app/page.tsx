import Link from "next/link";
import Image from "next/image";
import { ScrollAnimator } from "@/components/ScrollAnimator";
import { StickyHeader } from "@/components/StickyHeader";

const WHY_ITEMS = [
  {
    icon: "📜",
    title: "5,000 Years of Wisdom",
    desc: "Built on ancient Ba Zi analysis, Zhou Yi divination, and Wu Xing theory.",
  },
  {
    icon: "🤖",
    title: "AI-Enhanced Authenticity",
    desc: "Advanced AI analyzes thousands of classical texts to ensure cultural authenticity.",
  },
  {
    icon: "🎯",
    title: "Uniquely Yours",
    desc: "Crafted from your unique birth chart. No two names are identical.",
  },
  {
    icon: "🏮",
    title: "Deep Cultural Connection",
    desc: "Each name carries profound meaning from classical literature.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Share Your Story",
    sub: "Birth Chart Analysis",
    desc: "Tell us your birth details. Our AI analyzes your Ba Zi constitution.",
  },
  {
    step: "2",
    title: "Ancient Analysis",
    sub: "Zhou Yi & Wu Xing",
    desc: "Traditional principles meet modern theory to understand your energy.",
  },
  {
    step: "3",
    title: "Curated Names",
    sub: "Character Selection",
    desc: "We select characters from classical poetry that fit your constitution.",
  },
  {
    step: "4",
    title: "Discover Meaning",
    sub: "Cultural Depth",
    desc: "Explore deep cultural meanings and how each character influences you.",
  },
];

const EXAMPLE_CHARS = [
  { char: "林", pinyin: "Lín" },
  { char: "雨", pinyin: "Yǔ" },
  { char: "萱", pinyin: "Xuān" },
];

export default function LandingPage() {
  return (
    <ScrollAnimator>
      <StickyHeader />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-bg.png"
            alt="Background"
            fill
            className="object-cover object-bottom opacity-90"
            priority
          />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-[-10vh]">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-stone-900 mb-6 leading-tight animate-fade-in">
            HarmonyName
          </h1>
          <p className="text-xl md:text-2xl text-stone-600 italic font-serif mb-8 animate-fade-in delay-100">
            Discover the Chinese Name That Chooses You
          </p>
          <p className="text-lg text-stone-700 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in delay-200">
            Experience the profound wisdom of 5,000 years of Chinese naming
            traditions, enhanced by modern AI technology. Find a name that
            harmonizes with your destiny.
          </p>

          <div className="animate-fade-in delay-300">
            <Link href="/app">
              <button className="px-8 py-4 bg-stone-900 text-white text-lg rounded-full font-bold hover:bg-stone-800 hover:scale-105 transition-all shadow-2xl">
                Meet My Destined Name
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-24 px-4 bg-[#FBF3E1]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 scroll-animate">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-6">
              Why Choose HarmonyName?
            </h2>
            <p className="text-xl text-stone-600 max-w-3xl mx-auto">
              In Chinese culture, a name is not merely an identifier—it&apos;s a
              blessing, a destiny, a harmonious bridge between the individual and
              the universe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {WHY_ITEMS.map((item, i) => (
              <div
                key={i}
                className="bg-white p-8 rounded-2xl card-shadow-soft hover:card-shadow-soft-hover hover:-translate-y-1 transition-all duration-300 text-center scroll-animate"
              >
                <div className="text-5xl mb-6">{item.icon}</div>
                <h3 className="text-xl font-bold text-stone-900 mb-3 font-serif">
                  {item.title}
                </h3>
                <p className="text-stone-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 scroll-animate">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-6">
              How It Works
            </h2>
            <p className="text-xl text-stone-500">
              Four sacred steps to discover your perfect Chinese name.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {STEPS.map((item, i) => (
              <div
                key={i}
                className="bg-stone-50 p-10 rounded-3xl text-center scroll-animate hover:bg-[#FDFBF7] transition-colors border border-stone-100"
              >
                <div className="w-12 h-12 bg-stone-900 text-white rounded-full flex items-center justify-center text-xl font-bold mb-6 mx-auto">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-2 font-serif">
                  {item.title}
                </h3>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">
                  {item.sub}
                </p>
                <p className="text-stone-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cultural Section (Dark) */}
      <section className="py-32 px-4 bg-stone-900 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/hero-bg.png')] bg-cover bg-center" />
        <div className="relative z-10 max-w-4xl mx-auto scroll-animate">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8">
            Experience the Poetry of Names
          </h2>
          <p className="text-xl opacity-80 italic mb-16">
            &ldquo;A name carries the essence of one&apos;s destiny, like
            morning dew reflecting the entire sky.&rdquo;
          </p>

          <div className="flex justify-center gap-8 md:gap-16 mb-12">
            {EXAMPLE_CHARS.map((c, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-sm opacity-60 font-mono mb-2">
                  {c.pinyin}
                </span>
                <span className="text-6xl md:text-7xl font-serif">
                  {c.char}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl inline-block max-w-2xl">
            <p className="text-lg font-medium text-amber-200 mb-2">
              &ldquo;Forest Rain Lily&rdquo;
            </p>
            <p className="opacity-80 text-sm leading-relaxed">
              A name expressing serene strength against life&apos;s storms and
              the surprising power of nature.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-16 px-4 border-t border-stone-800">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <span className="text-2xl font-serif font-bold text-stone-200">
              HarmonyName
            </span>
          </div>
          <p className="max-w-xl mx-auto text-sm mb-12 opacity-60">
            Discover your Chinese identity through 5,000 years of wisdom and
            modern AI technology.
          </p>
          <div className="text-xs flex justify-center gap-8 pt-8 border-t border-stone-800">
            <span>&copy; {new Date().getFullYear()} HarmonyName</span>
            <a href="#" className="hover:text-white transition">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </ScrollAnimator>
  );
}

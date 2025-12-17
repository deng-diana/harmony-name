"use client"; // 👈 必须加，因为用到了 useEffect 和 useState

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// ⚠️ 请确保这两张图片已经放在 public 文件夹里，名字要对！
// 如果名字不一样，请在这里修改路径，比如 "/my-logo.png"
const LOGO_SRC = "/logo.png";
const HERO_BG_SRC = "/hero-bg.png"; // 假设你把背景图命名为 hero-bg.png

export default function LandingPage() {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // 滚动动画逻辑
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-fade-in-up"); // 使用 Tailwind 动画类
          entry.target.classList.remove("opacity-0", "translate-y-10");
        }
      });
    }, observerOptions);

    document.querySelectorAll(".scroll-animate").forEach((el) => {
      el.classList.add(
        "opacity-0",
        "translate-y-10",
        "transition-all",
        "duration-700"
      ); // 初始化隐身
      observerRef.current?.observe(el);
    });

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="bg-[#FDFBF7] font-sans text-stone-900 overflow-x-hidden">
      {/* Navigation */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-md border-b border-stone-100 py-2"
            : "py-4"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="relative w-10 h-10">
              <Image
                src={LOGO_SRC}
                alt="HarmonyName Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight text-stone-900">
              HarmonyName
            </span>
          </div>

          <Link href="/app">
            <button className="px-6 py-2.5 rounded-full bg-stone-900 text-white hover:bg-stone-800 transition-all duration-300 font-medium text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              Find My Name
            </button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* 背景图层 */}
        <div className="absolute inset-0 z-0">
          <Image
            src={HERO_BG_SRC}
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
              In Chinese culture, a name is not merely an identifier—it's a
              blessing, a destiny, a harmonious bridge between the individual
              and the universe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
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
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-center scroll-animate"
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
            {[
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
            ].map((item, i) => (
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
        <div className="absolute inset-0 opacity-10 bg-[url('/hero-bg.png')] bg-cover bg-center"></div>
        <div className="relative z-10 max-w-4xl mx-auto scroll-animate">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8">
            Experience the Poetry of Names
          </h2>
          <p className="text-xl opacity-80 italic mb-16">
            "A name carries the essence of one's destiny, like morning dew
            reflecting the entire sky."
          </p>

          <div className="flex justify-center gap-8 md:gap-16 mb-12">
            {[
              { char: "林", pinyin: "Lín" },
              { char: "雨", pinyin: "Yǔ" },
              { char: "萱", pinyin: "Xuān" },
            ].map((c, i) => (
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
              "Forest Rain Lily"
            </p>
            <p className="opacity-80 text-sm leading-relaxed">
              A name expressing serene strength against life's storms and the
              surprising power of nature.
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
            <span>© 2025 HarmonyName</span>
            <a href="#" className="hover:text-white transition">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

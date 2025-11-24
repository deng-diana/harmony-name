"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  calculateBazi,
  SHICHEN_MAPPING,
  type BaziResult,
  ARCHETYPES,
} from "@/lib/bazi";
import { COMMON_SURNAMES, type CommonSurname } from "@/lib/surnames";
import {
  Loader2,
  ArrowRight,
  RefreshCw,
  Volume2,
  CloudSun,
  Scale,
  Search,
} from "lucide-react";

interface NameChar {
  char: string;
  pinyin: string;
  meaning: string;
  type: string;
  element: string;
}
interface CoreAnalysis {
  title: string;
  explanation: string;
}
interface NameOption {
  hanzi: string;
  pinyin: string;
  poeticMeaning: string;
  culturalHeritage: { source: string; original: string; translation: string };
  anatomy: NameChar[];
  masterComment: string;
}
interface ApiResponse {
  names: NameOption[];
}

const HighlightText = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split(/\b(Wood|Fire|Earth|Metal|Water)\b/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (["Wood", "Fire", "Earth", "Metal", "Water"].includes(part)) {
          return (
            <strong key={i} className="font-bold text-stone-900">
              {part}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

const ELEMENT_BADGE_STYLES: Record<string, string> = {
  Wood: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Fire: "bg-rose-50 text-rose-600 border-rose-100",
  Earth: "bg-amber-50 text-amber-700 border-amber-100",
  Metal: "bg-slate-50 text-slate-600 border-slate-200",
  Water: "bg-sky-50 text-sky-600 border-sky-100",
};

const getElementBadgeClasses = (element?: string) =>
  ELEMENT_BADGE_STYLES[element || ""] ||
  "bg-stone-50 text-stone-500 border-stone-200";

const FiveElementsChart = ({
  wuxing,
  dayMaster,
}: {
  wuxing: BaziResult["wuxing"];
  dayMaster: string;
}) => {
  const elements = [
    { key: "wood", label: "Wood", color: "#16a34a", angle: -90 },
    { key: "fire", label: "Fire", color: "#dc2626", angle: -18 },
    { key: "earth", label: "Earth", color: "#d97706", angle: 54 },
    { key: "gold", label: "Metal", color: "#94a3b8", angle: 126 },
    { key: "water", label: "Water", color: "#2563eb", angle: 198 },
  ];
  const radius = 85;
  const center = 110;
  return (
    <div className="relative w-full max-w-[280px] aspect-square mx-auto">
      <svg viewBox="0 0 220 220" className="w-full h-full overflow-visible">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        {elements.map((el) => {
          const rad = (el.angle * Math.PI) / 180;
          const x = center + radius * Math.cos(rad);
          const y = center + radius * Math.sin(rad);
          // @ts-ignore
          const count = wuxing[el.key];
          const isDayMaster = el.label === dayMaster;
          return (
            <g key={el.key}>
              <circle
                cx={x}
                cy={y}
                r={24}
                fill="white"
                stroke={el.color}
                strokeWidth={isDayMaster ? 4 : 2}
                className="transition-all duration-500"
              />
              <text
                x={x}
                y={y}
                dy="-0.3em"
                textAnchor="middle"
                className="text-[10px] font-bold fill-stone-500 font-sans"
              >
                {el.label}
              </text>
              <text
                x={x}
                y={y}
                dy="1em"
                textAnchor="middle"
                className="text-[12px] font-bold fill-stone-900 font-mono"
              >
                {count}
              </text>
              {isDayMaster && (
                <g>
                  <rect
                    x={x - 16}
                    y={y + 30}
                    width="32"
                    height="12"
                    rx="6"
                    fill="#1c1917"
                  />
                  <text
                    x={x}
                    y={y + 38}
                    textAnchor="middle"
                    className="text-[8px] font-bold fill-white uppercase tracking-wider"
                  >
                    CORE
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default function Home() {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("unknown");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [surnamePreference, setSurnamePreference] = useState<
    "any" | "common" | "specified"
  >("any");
  const [surnameQuery, setSurnameQuery] = useState("");
  const [selectedSurname, setSelectedSurname] = useState<CommonSurname | null>(
    null
  );
  const [surnameError, setSurnameError] = useState<string | null>(null);

  const [phase, setPhase] = useState<"form" | "results">("form");
  const [baziResult, setBaziResult] = useState<BaziResult | null>(null);
  const [aiData, setAiData] = useState<ApiResponse | null>(null);
  const [isNamesLoading, setIsNamesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferredVoice, setPreferredVoice] =
    useState<SpeechSynthesisVoice | null>(null);

  const filteredSurnames = useMemo(() => {
    if (!surnameQuery.trim()) return [];
    const q = surnameQuery.trim().toLowerCase();
    return COMMON_SURNAMES.filter((s) => {
      const pinyinRaw = s.english
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return (
        s.chinese.includes(q) ||
        s.english.toLowerCase().includes(q) ||
        pinyinRaw.includes(q)
      );
    }).slice(0, 5);
  }, [surnameQuery]);

  const handleCalculate = async () => {
    if (!birthDate) {
      alert("Please select date");
      return;
    }
    setSurnameError(null);

    let apiSpecifiedSurname = "";
    let apiSurnamePreference =
      surnamePreference === "any" ? "auto" : "specified";

    if (surnamePreference === "specified") {
      const input = surnameQuery.trim();
      if (selectedSurname) {
        apiSpecifiedSurname = selectedSurname.chinese;
      } else if (input) {
        const hasChineseChar = /[\u4e00-\u9fa5]/.test(input);
        if (hasChineseChar) {
          apiSpecifiedSurname = input;
        } else {
          setSurnameError(
            "Please enter a valid Chinese surname (e.g. 张). Pinyin guessing is too inaccurate."
          );
          return;
        }
      } else {
        apiSurnamePreference = "auto";
      }
    }

    setError(null);
    setAiData(null);
    setIsNamesLoading(true);

    const result = calculateBazi(birthDate, birthTime);
    setBaziResult(result);
    setPhase("results");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wuxing: result.wuxing,
          gender,
          dayMaster: result.dayMaster,
          bazi: result.bazi,
          strength: result.strength,
          favourableElements: result.favourableElements,
          avoidElements: result.avoidElements,
          surnamePreference: apiSurnamePreference,
          specifiedSurname: apiSpecifiedSurname,
        }),
      });
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      setAiData(data);
    } catch (e) {
      setError("The ancient oracle is momentarily silent. Please try again.");
    } finally {
      setIsNamesLoading(false);
    }
  };

  const limitPoemSentences = (
    text: string,
    preferredCount = 2,
    maxCount = 3
  ) => {
    if (!text) return "";
    const sentences: string[] = [];
    let buffer = "";
    const sentenceEnd = /[。！？!?]/;

    for (const char of text) {
      buffer += char;
      if (sentenceEnd.test(char)) {
        if (buffer.trim()) sentences.push(buffer.trim());
        buffer = "";
      }
    }
    if (buffer.trim()) sentences.push(buffer.trim());

    if (!sentences.length) return text;

    const hasPreferred = sentences.length >= preferredCount;
    const sliceCount = hasPreferred
      ? Math.min(preferredCount, maxCount)
      : Math.min(sentences.length, maxCount);

    return sentences.slice(0, sliceCount).join(" ");
  };

  const renderPoem = (text: string, allowedHighlights?: Set<string>) => {
    const limitedText = limitPoemSentences(text);
    if (!limitedText) return null;

    return limitedText.split(/({.*?})/).map((part, i) => {
      const isBracketed = part.startsWith("{") && part.endsWith("}");
      if (!isBracketed) return <span key={i}>{part}</span>;

      const inner = part.slice(1, -1);
      const cleaned = inner.trim();
      const canHighlight =
        allowedHighlights &&
        cleaned.length > 0 &&
        [...cleaned].every((char) => allowedHighlights.has(char));

      if (canHighlight) {
        return (
          <span key={i} className="text-red-800 font-bold mx-0.5">
            {cleaned}
          </span>
        );
      }

      return <span key={i}>{cleaned}</span>;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;

    const selectVoice = () => {
      const voices = synth.getVoices();
      if (!voices.length) return;

      const softPattern = /(female|woman|xiao|mei|qing|yun|soft|sweet)/i;
      const zhVoices = voices.filter((voice) =>
        voice.lang.toLowerCase().startsWith("zh")
      );
      const zhSoft =
        zhVoices.find((voice) => softPattern.test(voice.name)) || zhVoices[0];
      const fallback =
        voices.find((voice) => softPattern.test(voice.name)) || voices[0];

      setPreferredVoice(zhSoft || fallback || null);
    };

    selectVoice();
    if (synth.addEventListener) {
      synth.addEventListener("voiceschanged", selectVoice);
    } else {
      synth.onvoiceschanged = selectVoice;
    }

    return () => {
      if (synth.removeEventListener) {
        synth.removeEventListener("voiceschanged", selectVoice);
      } else if (synth.onvoiceschanged === selectVoice) {
        synth.onvoiceschanged = null;
      }
    };
  }, []);

  const speakName = useCallback(
    (hanzi: string, fallbackPinyin: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        alert("Current browser does not support voice playback.");
        return;
      }
      const utterance = new SpeechSynthesisUtterance(hanzi || fallbackPinyin);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      } else {
        utterance.lang = "zh-CN";
      }
      utterance.pitch = 1.05;
      utterance.rate = 0.94;
      utterance.volume = 1;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [preferredVoice]
  );

  if (phase === "results" && baziResult) {
    // @ts-ignore
    const archetype = ARCHETYPES[baziResult.dayMaster];

    const metaSurname =
      surnamePreference === "any"
        ? ""
        : `· Surname: ${selectedSurname?.chinese || surnameQuery}`;
    const metaTime = SHICHEN_MAPPING.find((t) => t.value === birthTime)
      ?.label.split("(")[0]
      .trim();
    const metaString = `Born: ${birthDate} · Hour: ${metaTime} · ${
      gender === "male" ? "Male" : "Female"
    } ${metaSurname}`;

    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center py-12 px-4 font-sans text-stone-900">
        <header className="w-full max-w-4xl mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-serif tracking-tight text-stone-900 mb-3">
            You are the {baziResult.dayMaster} Archetype
          </h1>
          <div className="text-sm md:text-base text-stone-500 font-serif leading-relaxed space-y-1">
            <p>
              Decoded from ancient wisdom, powered by AI — customized with your
              birth profile.
            </p>
            <p>{metaString}</p>
          </div>
        </header>

        <main className="w-full max-w-4xl space-y-16">
          {/* DESTINY CARD */}
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

            <div className="p-8 md:p-10 grid md:grid-cols-5 gap-10 items-start border-b border-stone-100">
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
                    Defined by the Heavenly Stem of your birth day — the element
                    that represents your core nature.
                  </p>

                  <div className="bg-stone-50 rounded-xl border border-stone-100 overflow-hidden">
                    {baziResult.coreExplanation.points.map((point, i) => (
                      <div
                        key={i}
                        className="p-4 border-b border-stone-100 last:border-0 flex gap-3 items-start"
                      >
                        <div className="mt-0.5 text-stone-400">
                          {i === 0 ? (
                            <CloudSun className="w-4 h-4" />
                          ) : (
                            <Scale className="w-4 h-4" />
                          )}
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
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Removed "How to Stay Balanced" section completely */}
          </section>

          {/* NAME SUGGESTIONS */}
          <section>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-serif font-bold text-stone-900">
                Master's Selection
              </h2>
            </div>

            {isNamesLoading && (
              <div className="py-20 text-center bg-white rounded-2xl border border-stone-100">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-stone-300 mb-4" />
                <p className="text-stone-600 font-medium animate-pulse">
                  Consulting the ancient texts...
                </p>
              </div>
            )}

            {error && (
              <div className="text-center text-red-600 p-8 bg-white rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <div className="grid gap-8">
              {aiData &&
                aiData.names &&
                aiData.names.map((name, index) => {
                  const cleanedName = (name.hanzi || "").replace(/[{}\s]/g, "");
                  const highlightChars = new Set(
                    cleanedName.split("").filter(Boolean)
                  );

                  return (
                    <div
                      key={index}
                      className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-stone-200 hover:shadow-xl transition-all duration-500 relative overflow-hidden group"
                    >
                      <div className="absolute -right-12 -top-12 text-[12rem] font-serif text-stone-50 opacity-50 select-none pointer-events-none group-hover:text-stone-100 transition-colors">
                        {cleanedName.charAt(0)}
                      </div>

                      <div className="relative z-10">
                        <div className="mb-8 text-left">
                          {/* 🟢 名字标题：自动清洗花括号 */}
                          <div className="relative inline-block mb-4 pr-10">
                            <h3 className="text-[2.75rem] md:text-[3.5rem] font-serif text-stone-900 tracking-tight leading-none">
                              {cleanedName}
                            </h3>
                            <button
                              type="button"
                              onClick={() =>
                                speakName(cleanedName, name.pinyin)
                              }
                              className="absolute bottom-0 right-0 rounded-full border border-stone-200 p-2 text-stone-600 hover:text-stone-900 hover:border-stone-400 transition bg-white shadow-sm"
                              aria-label={`Play pronunciation for ${cleanedName}`}
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3 text-stone-500">
                            <span className="text-xl font-medium tracking-wide font-serif">
                              {name.pinyin}
                            </span>
                          </div>
                          <div className="mt-6">
                            <p className="text-lg md:text-xl text-stone-800 font-serif italic leading-relaxed">
                              “{name.poeticMeaning}”
                            </p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-10 pt-8 border-t border-stone-100">
                          <div>
                            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              📖 Cultural Heritage
                            </h4>
                            <div className="bg-[#FFFCF5] p-5 rounded-xl border border-stone-100">
                              <p className="text-stone-800 font-serif text-lg mb-2 leading-relaxed">
                                {renderPoem(
                                  name.culturalHeritage?.original || "",
                                  highlightChars
                                )}
                              </p>
                              <p className="text-sm text-stone-500 italic mb-3 border-l-2 border-stone-300 pl-3">
                                "{name.culturalHeritage?.translation}"
                              </p>
                              <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wide">
                                Source: {name.culturalHeritage?.source}
                              </div>
                            </div>
                          </div>

                          {/* Anatomy (精致化) */}
                          <div>
                            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
                              🔍 The Anatomy
                            </h4>
                            <div className="space-y-4">
                              {name.anatomy &&
                                name.anatomy.map((char, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-4"
                                  >
                                    {/* w-9 h-9 */}
                                    <div className="w-9 h-9 bg-stone-900 text-white rounded-lg flex items-center justify-center font-serif text-lg flex-shrink-0">
                                      {char.char}
                                    </div>
                                    <div className="flex-1 flex items-center text-sm text-stone-800">
                                      <span className="text-stone-600">
                                        {char.meaning}
                                      </span>
                                    </div>
                                    <div
                                      className={`text-[10px] font-bold px-3 py-1 rounded-full border flex-shrink-0 transition-colors ${getElementBadgeClasses(
                                        char.element
                                      )}`}
                                    >
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
                })}
            </div>
          </section>

          <div className="text-center pt-12 pb-24">
            <button
              onClick={() => {
                setPhase("form");
                setAiData(null);
                window.scrollTo(0, 0);
              }}
              className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-900 transition px-6 py-3 rounded-full border border-stone-200 hover:bg-white hover:shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Start over with different
              details
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ... (Form Phase 代码保持不变)
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center py-12 px-4 sm:px-6 font-sans">
      {/* 此处省略了表单部分的重复代码，请保留你原来的表单代码 */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-4xl font-bold text-stone-900 sm:text-5xl font-serif mb-4">
          HarmonyName
        </h1>
        <p className="text-stone-600">
          Authentic Chinese naming through BaZi wisdom.
        </p>
      </div>

      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-stone-100">
        <div className="mb-6">
          <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide mb-2">
            Date of Birth
          </label>
          <input
            type="date"
            className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-900 focus:ring-2 focus:ring-stone-900 focus:border-transparent outline-none transition-all"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>
        <div className="mb-6">
          <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide mb-2">
            Time of Birth
          </label>
          <div className="relative">
            <select
              className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-900 focus:ring-2 focus:ring-stone-900 outline-none appearance-none"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
            >
              {SHICHEN_MAPPING.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
              ▼
            </div>
          </div>
        </div>
        <div className="mb-8">
          <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide mb-2">
            Gender
          </label>
          <div className="flex gap-3">
            {["male", "female"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g as any)}
                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                  gender === g
                    ? "border-stone-900 bg-stone-50 ring-2 ring-stone-900 text-stone-900"
                    : "border-stone-200 text-stone-500 hover:border-stone-300"
                }`}
              >
                {g === "male" ? "Male" : "Female"}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-10">
          <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide mb-2">
            Surname Preference
          </label>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setSurnamePreference("any");
                setSelectedSurname(null);
                setSurnameQuery("");
                setSurnameError(null);
              }}
              className={`w-full flex items-center px-4 py-4 rounded-xl border text-left transition-all ${
                surnamePreference === "any"
                  ? "border-stone-900 bg-stone-50 ring-2 ring-stone-900"
                  : "border-stone-200 hover:border-stone-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center ${
                  surnamePreference === "any"
                    ? "border-stone-900"
                    : "border-stone-300"
                }`}
              >
                {surnamePreference === "any" && (
                  <div className="w-2.5 h-2.5 rounded-full bg-stone-900" />
                )}
              </div>
              <span className="text-sm font-bold text-stone-900">
                Recommended by Master
              </span>
            </button>
            <div
              className={`rounded-xl border overflow-hidden transition-all ${
                surnamePreference === "specified"
                  ? "border-stone-900 ring-2 ring-stone-900 bg-stone-50"
                  : "border-stone-200"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setSurnamePreference("specified");
                }}
                className="w-full flex items-center px-4 py-4 text-left"
              >
                <div
                  className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center ${
                    surnamePreference === "specified"
                      ? "border-stone-900"
                      : "border-stone-300"
                  }`}
                >
                  {surnamePreference === "specified" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-stone-900" />
                  )}
                </div>
                <span className="text-sm font-bold text-stone-900">
                  I have a specific surname
                </span>
              </button>
              {surnamePreference === "specified" && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={surnameQuery}
                      onChange={(e) => {
                        setSurnameQuery(e.target.value);
                        setSelectedSurname(null);
                        setSurnameError(null);
                      }}
                      placeholder="Type Pinyin (e.g. Wang) or Chinese"
                      className={`w-full pl-10 pr-4 py-3 bg-white border rounded-lg text-sm outline-none focus:ring-2 transition-all ${
                        surnameError
                          ? "border-red-500 focus:ring-red-200"
                          : "border-stone-200 focus:ring-stone-900"
                      }`}
                    />
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  </div>
                  {surnameError && (
                    <div className="mt-2 flex items-start gap-2 text-red-600 text-xs bg-red-50 p-2 rounded-lg">
                      <span className="w-4 h-4">⚠️</span>
                      <span>{surnameError}</span>
                    </div>
                  )}
                  {surnameQuery &&
                    !selectedSurname &&
                    filteredSurnames.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto border border-stone-200 rounded-lg bg-white shadow-sm">
                        {filteredSurnames.map((s) => (
                          <button
                            key={s.chinese}
                            onClick={() => {
                              setSelectedSurname(s);
                              setSurnameQuery(`${s.chinese} ${s.english}`);
                              setSurnameError(null);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex justify-between group"
                          >
                            <span className="font-bold text-stone-800 group-hover:text-stone-900">
                              {s.chinese}{" "}
                              <span className="font-normal text-stone-500">
                                {s.english}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  {surnameQuery &&
                    !selectedSurname &&
                    filteredSurnames.length === 0 && (
                      <div className="mt-2 text-xs text-stone-500 px-1">
                        Not in our common list? Please enter the{" "}
                        <strong>Chinese character</strong> directly (e.g. 张).
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={handleCalculate}
          className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-stone-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2"
        >
          Reveal My Destiny Name <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

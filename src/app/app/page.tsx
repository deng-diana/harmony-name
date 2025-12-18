"use client";

import { useMemo, useState, useEffect } from "react";
import {
  calculateBazi,
  SHICHEN_MAPPING,
  type BaziResult,
  ARCHETYPES,
} from "@/lib/bazi";
import { COMMON_SURNAMES, type CommonSurname } from "@/lib/surnames";
import { speakChineseName, stopSpeaking } from "@/lib/tts";
import {
  Loader2,
  ArrowRight,
  RefreshCw,
  Volume2,
  Sparkles,
  Search,
  CloudSun,
  Scale,
  MapPin,
} from "lucide-react";

// --- Interfaces ---
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

// 🆕 新增：城市数据结构
interface City {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string; // 省/州
  timezone: string;
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

  // 🆕 City Search State
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [isCityLoading, setIsCityLoading] = useState(false);

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
  
  // 🎤 语音播放状态
  const [playingNameIndex, setPlayingNameIndex] = useState<number | null>(null);

  // 🎤 确保语音列表加载完成（Web Speech API需要时间加载）
  useEffect(() => {
    // 某些浏览器需要触发一次getVoices()才能加载语音列表
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      // 某些浏览器在voiceschanged事件触发后才加载完成
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // 组件卸载时停止所有播放
    return () => {
      stopSpeaking();
    };
  }, []);

  // 🎤 处理名字语音播放
  const handlePlayName = async (name: NameOption, index: number) => {
    // 如果正在播放同一个名字，则停止
    if (playingNameIndex === index) {
      stopSpeaking();
      setPlayingNameIndex(null);
      return;
    }

    // 停止当前播放
    stopSpeaking();
    setPlayingNameIndex(index);

    try {
      const hanzi = name.hanzi.replace(/[{}]/g, "");
      await speakChineseName(hanzi);
    } catch (error) {
      console.error("语音播放失败:", error);
      // 如果Web API失败，可以在这里添加降级方案
    } finally {
      setPlayingNameIndex(null);
    }
  };

  // 🆕 城市搜索逻辑 (Debounce or simple trigger)
  const handleCitySearch = async (query: string) => {
    setCityQuery(query);
    if (query.length < 3) {
      setCityResults([]);
      return;
    }

    setIsCityLoading(true);
    try {
      // 调用 Open-Meteo 免费 API
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=en&format=json`
      );
      const data = await res.json();
      if (data.results) {
        setCityResults(data.results);
      } else {
        setCityResults([]);
      }
    } catch (e) {
      console.error("City search failed", e);
    } finally {
      setIsCityLoading(false);
    }
  };

  // 选择城市
  const selectCity = (city: City) => {
    setSelectedCity(city);
    setCityQuery(`${city.name}, ${city.country}`); // 显示选中结果
    setCityResults([]); // 关闭下拉
  };

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

    // 1. Local Calc
    // ⚠️ TODO: 下一步我们会把 selectedCity.longitude 传进去做真太阳时校准
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
          recommendedNameLength: result.recommendedNameLength,
        }),
      });

      if (!response.ok) {
        // Try to parse error response
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}` };
        }

        // Log error details for debugging
        console.error("API Error:", {
          status: response.status,
          code: errorData.code,
          details: errorData.details,
        });

        // Show user-friendly error message
        const userMessage =
          errorData.code === "ENV_MISSING"
            ? "Server configuration error. Please contact support."
            : errorData.code === "API_ERROR" ||
              errorData.code === "EMPTY_RESPONSE"
            ? "The AI service is temporarily unavailable. Please try again."
            : errorData.details ||
              "The ancient oracle is momentarily silent. Please try again.";

        setError(userMessage);
        return;
      }

      const data = await response.json();
      setAiData(data);
    } catch (e: any) {
      console.error("Request failed:", e);
      setError(
        e.message ||
          "The ancient oracle is momentarily silent. Please try again."
      );
    } finally {
      setIsNamesLoading(false);
    }
  };

  // 🧠 智能高亮函数：不再依赖 AI 的花括号，前端自动匹配
  const renderPoem = (poem: string, nameHanzi: string) => {
    if (!poem) return null;

    // 1. 先清洗掉 AI 可能传回来的花括号，还原纯文本
    const cleanPoem = poem.replace(/[{}]/g, "");

    // 2. 把名字拆成字符集 (比如 "邓春芳" -> Set{"邓", "春", "芳"})
    // 注意：通常我们只高亮“名”，不因该高亮“姓”（如果姓在诗里出现，通常是巧合）
    // 但为了简单且不出错，我们先匹配所有字。如果你想排除姓，可以只传 Given Name。
    // 这里我们做一个优化：只匹配名字的后两个字（Given Name），避免把无关的字标红
    // 假设 3字名：Surname(1) + Given(2)。 2字名：Surname(1) + Given(1)。
    // 我们取 nameHanzi 的最后 (length - 1) 个字作为“名”的特征。

    const givenName = nameHanzi.length > 1 ? nameHanzi.slice(1) : nameHanzi;
    const targetChars = new Set(givenName.split(""));

    // 3. 逐字渲染
    return cleanPoem.split("").map((char, i) => {
      // 标点符号不处理
      if (["，", "。", "！", "？", "、", " "].includes(char)) {
        return <span key={i}>{char}</span>;
      }

      if (targetChars.has(char)) {
        return (
          <span key={i} className="text-red-700 font-bold mx-0.5 text-lg">
            {char}
          </span>
        );
      }
      return (
        <span key={i} className="text-stone-800">
          {char}
        </span>
      );
    });
  };

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
    // 🆕 结果页显示出生地
    const metaLocation = selectedCity ? `· ${selectedCity.name}` : "";
    const metaString = `Born: ${birthDate} · Hour: ${metaTime} ${metaLocation} · ${
      gender === "male" ? "Male" : "Female"
    } ${metaSurname}`;

    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center py-12 px-4 font-sans text-stone-900">
        <header className="w-full max-w-4xl mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-serif tracking-tight text-stone-900 mb-3">
            You are the {baziResult.dayMaster} Archetype
          </h1>
          <div className="text-xs md:text-sm text-stone-500 font-mono uppercase tracking-wide mb-1">
            {metaString}
          </div>
          <p className="text-xs text-stone-400 italic">
            Decoded from ancient wisdom, powered by AI.
          </p>
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
                aiData.names.map((name, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl p-8 md:p-10 shadow-sm border border-stone-200 hover:shadow-xl transition-all duration-500 relative overflow-hidden group"
                  >
                    <div className="absolute -right-12 -top-12 text-[12rem] font-serif text-stone-50 opacity-50 select-none pointer-events-none group-hover:text-stone-100 transition-colors">
                      {name.hanzi.replace(/[{}]/g, "").charAt(0)}
                    </div>

                    <div className="relative z-10">
                      <div className="mb-8 text-left">
                        <h3 className="text-6xl md:text-7xl font-serif text-stone-900 tracking-tight mb-3 leading-none">
                          {name.hanzi.replace(/[{}]/g, "")}
                        </h3>
                        <div className="flex items-center gap-3 text-stone-500">
                          <span className="text-xl font-medium tracking-wide font-serif">
                            {name.pinyin}
                          </span>
                          <button
                            onClick={() => handlePlayName(name, index)}
                            className={`transition-all ${
                              playingNameIndex === index
                                ? "text-stone-900 animate-pulse"
                                : "hover:text-stone-800 cursor-pointer"
                            }`}
                            aria-label="播放名字发音"
                          >
                            <Volume2 className="w-5 h-5" />
                          </button>
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
                                name.hanzi
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
                                  <div className="w-9 h-9 bg-stone-900 text-white rounded-lg flex items-center justify-center font-serif text-lg flex-shrink-0">
                                    {char.char}
                                  </div>
                                  <div className="flex-1 flex items-center text-sm text-stone-800">
                                    <span className="text-stone-700">
                                      {char.meaning}
                                    </span>
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
                ))}
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

  // --- FORM VIEW ---
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center py-12 px-4 sm:px-6 font-sans">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-4xl font-bold text-stone-900 sm:text-5xl font-serif mb-4">
          HarmonyName
        </h1>
        <p className="text-stone-600">
          Authentic Chinese naming through BaZi wisdom.
        </p>
      </div>

      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-stone-100">
        {/* Date */}
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

        {/* 🆕 City Search (Inserted Here) */}
        <div className="mb-6 relative">
          <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide mb-2">
            Birth City
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search city (e.g. London, New York)"
              value={cityQuery}
              onChange={(e) => handleCitySearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-900 focus:ring-2 focus:ring-stone-900 focus:border-transparent outline-none transition-all"
            />
            <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            {isCityLoading && (
              <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-stone-400" />
            )}
          </div>

          {/* City Dropdown */}
          {cityResults.length > 0 && (
            <div className="absolute z-20 w-full mt-2 bg-white border border-stone-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {cityResults.map((city) => (
                <button
                  key={city.id}
                  onClick={() => selectCity(city)}
                  className="w-full text-left px-4 py-3 hover:bg-stone-50 border-b border-stone-100 last:border-0 transition-colors"
                >
                  <div className="font-bold text-stone-800 text-sm">
                    {city.name}
                  </div>
                  <div className="text-xs text-stone-500">
                    {city.admin1 ? `${city.admin1}, ` : ""}
                    {city.country}
                  </div>
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-[10px] text-stone-400">
            Used for accurate solar time calculation.
          </p>
        </div>

        {/* Time */}
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

        {/* Gender */}
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

        {/* Surname Preference */}
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

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import {
  calculateBazi,
  SHICHEN_MAPPING,
  ARCHETYPES,
  type BaziResult,
} from "@/lib/bazi";
import type { CommonSurname } from "@/lib/surnames";
import type { ApiResponse } from "@/types";
import {
  ArrowRight,
  RefreshCw,
} from "lucide-react";

import { useCitySearch } from "@/hooks/useCitySearch";
import { useTTS } from "@/hooks/useTTS";

import { DestinyCard } from "@/components/DestinyCard";
import { NameCard } from "@/components/NameCard";
import { CitySearch } from "@/components/CitySearch";
import { SurnameSelector } from "@/components/SurnameSelector";
import { GenerationProgress } from "@/components/GenerationProgress";
import { Button } from "@/components/ui/Button";

export default function Home() {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("unknown");
  const [gender, setGender] = useState<"male" | "female">("male");

  const {
    cityQuery,
    cityResults,
    selectedCity,
    isCityLoading,
    handleCitySearch,
    selectCity,
  } = useCitySearch();

  const [surnamePreference, setSurnamePreference] = useState<
    "any" | "common" | "specified"
  >("any");
  const [surnameQuery, setSurnameQuery] = useState("");
  const [selectedSurname, setSelectedSurname] = useState<CommonSurname | null>(
    null
  );
  const [surnameError, setSurnameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [phase, setPhase] = useState<"form" | "results">("form");
  const [baziResult, setBaziResult] = useState<BaziResult | null>(null);
  const [aiData, setAiData] = useState<ApiResponse | null>(null);
  const [isNamesLoading, setIsNamesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ step: 0, total: 4, message: "" });

  const { playingNameIndex, handlePlayName } = useTTS();

  // 取消生成中的 SSE 流(卸载/导航/重开/Start over)—— 防僵尸 setState、连接泄漏、
  // 两条并发流交错写 state。卸载时也中止。
  const abortRef = useRef<AbortController | null>(null);
  // 卸载时中止并置 null —— 置 null 让 fetch finally 的 `abortRef.current === ac` 守卫失效,
  // 从而不在已卸载组件上 setState / router.refresh(主动中止不该有副作用)。
  useEffect(
    () => () => {
      abortRef.current?.abort();
      abortRef.current = null;
    },
    []
  );

  const handleCalculate = async () => {
    if (isNamesLoading) return; // 兜底:防重复提交(两条流 → 双扣积分 + 状态交错)
    setFormError(null);
    // 原生日期框只要没填完整(如只填了年月没填日),value 就是空字符串
    if (!birthDate) {
      setFormError(
        "Please pick your full date of birth — year, month, and day."
      );
      return;
    }
    // 出生城市必填:它提供经度+时区,是「真太阳时」和「北京时间换算」的前提,
    // 没有它就只能退回不准的本地时间。算命产品本就该问出生地。
    if (!selectedCity) {
      setFormError(
        "Please select your birth city — it's required for an accurate solar-time calculation."
      );
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

    // Client-side validation passed — the birth form was submitted successfully.
    track("form_completed");

    // Local BaZi calculation (with True Solar Time if city is selected)
    const city = selectedCity
      ? { longitude: selectedCity.longitude, timezone: selectedCity.timezone }
      : undefined;
    const result = calculateBazi(birthDate, birthTime, city);
    setBaziResult(result);
    setPhase("results");

    // SSE Streaming — 实时接收后端每一步的进度
    // 技术原理:
    //   1. fetch 发 POST 请求，后端返回 text/event-stream
    //   2. 用 ReadableStream reader 逐行读取
    //   3. 每收到一行 "data: {...}" 就解析并更新 UI
    // 新请求前中止上一条流(若有),并新建控制器供本次取消。
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      setProgress({ step: 0, total: 4, message: "Connecting..." });
      track("generation_started");

      const response = await fetch("/api/generate", {
        method: "POST",
        signal: ac.signal,
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

      if (!response.ok || !response.body) {
        // 未登录 → 回登录页
        if (response.status === 401) {
          track("login_wall_hit");
          router.push("/login");
          return;
        }
        // 触发限流 → 让用户稍等
        if (response.status === 429) {
          setError("You're going a bit fast — please wait a moment and try again.");
          setIsNamesLoading(false);
          return;
        }
        // 积分不足 → 直接送去充值页
        if (response.status === 402) {
          router.push("/buy");
          return;
        }
        setError("The ancient oracle is momentarily silent. Please try again.");
        setIsNamesLoading(false);
        return;
      }

      // 读取 SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 把收到的字节解码为文本，追加到 buffer
        buffer += decoder.decode(value, { stream: true });

        // SSE 格式: 每条消息以 "\n\n" 分隔
        const events = buffer.split("\n\n");
        // 最后一项可能是不完整的消息，留在 buffer 里
        buffer = events.pop() || "";

        for (const event of events) {
          // 每行格式: "data: {json}"
          const dataLine = event
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (!dataLine) continue;

          const jsonStr = dataLine.slice(6); // 去掉 "data: " 前缀
          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.type === "progress") {
              setProgress({
                step: parsed.step,
                total: parsed.total,
                message: parsed.message,
              });
            } else if (parsed.type === "result") {
              track("generation_succeeded");
              setAiData(parsed.data);
            } else if (parsed.type === "error") {
              track("generation_failed");
              // 绝不向用户暴露内部报错细节(API key、堆栈等);失败已自动退款
              setError(
                "The naming master couldn't finish this time — your credit has been refunded. Please try again."
              );
            }
          } catch {
            // 忽略无法解析的行
          }
        }
      }
    } catch (e: unknown) {
      // 主动取消(卸载/重开/Start over)不是错误,静默 return,不写已重置的 state。
      if (e instanceof DOMException && e.name === "AbortError") return;
      console.error("Request failed:", e);
      setError("The ancient oracle is momentarily silent. Please try again.");
    } finally {
      // 只有"还是本次请求"时才收尾(被新请求 abort 的旧流不该动 state)。
      if (abortRef.current === ac) {
        setIsNamesLoading(false);
        router.refresh(); // 无论成功/错误/断流,结束时都向服务端对一次积分余额
      }
    }
  };

  // --- RESULTS VIEW ---
  if (phase === "results" && baziResult) {
    const metaSurname =
      surnamePreference === "any"
        ? ""
        : `· Surname: ${selectedSurname?.chinese || surnameQuery}`;
    const metaTime = SHICHEN_MAPPING.find((t) => t.value === birthTime)
      ?.label.split("(")[0]
      .trim();
    const metaLocation = selectedCity ? `· ${selectedCity.name}` : "";
    const metaString = `Born: ${birthDate} · Hour: ${metaTime} ${metaLocation} · ${
      gender === "male" ? "Male" : "Female"
    } ${metaSurname}`;

    return (
      <div className="min-h-screen bg-paper py-12 px-4 sm:px-6 font-sans text-ink">
        <main className="mx-auto max-w-6xl lg:grid lg:grid-cols-2 lg:gap-16 lg:items-start">
          {/* LEFT — your destiny archetype; sticky beside the scrolling names on desktop */}
          <div className="space-y-8 lg:sticky lg:top-10 lg:self-start animate-fade-in-up">
            <header className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold font-serif tracking-tight text-ink mb-3">
                You are the {baziResult.dayMaster} Archetype
              </h1>
              <div className="text-[11px] md:text-xs text-ink-faint font-mono uppercase tracking-wide mb-1">
                {metaString}
              </div>
              <p className="text-xs text-ink-faint/80 italic">
                Decoded from ancient wisdom, powered by AI. For cultural &amp;
                entertainment purposes.
              </p>
            </header>
            <DestinyCard baziResult={baziResult} />
          </div>

          {/* RIGHT — the Master's name selection; scrolls beside the sticky left */}
          <div className="mt-16 lg:mt-0 lg:border-l lg:border-mist lg:pl-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink">
                Master&apos;s Selection
              </h2>
            </div>

            {isNamesLoading && (
              <GenerationProgress
                currentStep={progress.step}
                totalSteps={progress.total}
                message={progress.message}
              />
            )}

            {error && (
              <div className="text-center text-red-600 p-8 bg-white rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <div className="grid gap-8">
              {aiData?.names?.map((name, index) => (
                // 揭晓时刻:三个名字逐个"显形"(淡入+上浮+极轻放大),每张错峰 90ms。
                <div
                  key={index}
                  className="animate-reveal"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <NameCard
                    name={name}
                    index={index}
                    playingNameIndex={playingNameIndex}
                    onPlayName={handlePlayName}
                    archetype={
                      ARCHETYPES[
                        baziResult.dayMaster as keyof typeof ARCHETYPES
                      ]
                    }
                  />
                </div>
              ))}
            </div>

            {/* 仅在【非加载中】显示;加载时隐藏,免得和进度卡挤在一起显乱 */}
            {!isNamesLoading && (
              <div className="text-center pt-12 pb-8">
                <Button
                  variant="secondary"
                  onClick={() => {
                    abortRef.current?.abort(); // 中止仍在跑的流,避免它稍后把名字写回已重置的表单
                    abortRef.current = null; // 置 null:让旧流的 finally 守卫失效,不再 refresh
                    setIsNamesLoading(false);
                    setPhase("form");
                    setAiData(null);
                    window.scrollTo(0, 0);
                  }}
                  className="rounded-full text-ink-soft"
                >
                  <RefreshCw className="w-4 h-4" /> Start over with different
                  details
                </Button>
              </div>
            )}
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
            className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-900 focus:ring-2 focus:ring-stone-900 focus:border-transparent outline-none transition-colors duration-200 ease-soft"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>

        <CitySearch
          cityQuery={cityQuery}
          cityResults={cityResults}
          isCityLoading={isCityLoading}
          onSearch={handleCitySearch}
          onSelect={selectCity}
        />

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
              &#9660;
            </div>
          </div>
        </div>

        {/* Gender */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide mb-2">
            Gender
          </label>
          <div className="flex gap-3">
            {(["male", "female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-colors duration-200 ease-soft ${
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

        <SurnameSelector
          surnamePreference={surnamePreference}
          setSurnamePreference={setSurnamePreference}
          surnameQuery={surnameQuery}
          setSurnameQuery={setSurnameQuery}
          selectedSurname={selectedSurname}
          setSelectedSurname={setSelectedSurname}
          surnameError={surnameError}
          setSurnameError={setSurnameError}
        />

        {formError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            {formError}
          </div>
        )}

        <Button
          onClick={handleCalculate}
          loading={isNamesLoading}
          size="lg"
          className="w-full"
        >
          {isNamesLoading ? "Generating…" : "Reveal My Destiny Name"}
          {!isNamesLoading && <ArrowRight className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  );
}

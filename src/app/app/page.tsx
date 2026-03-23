"use client";

import { useState } from "react";
import {
  calculateBazi,
  SHICHEN_MAPPING,
  type BaziResult,
} from "@/lib/bazi";
import type { CommonSurname } from "@/lib/surnames";
import type { ApiResponse } from "@/types";
import {
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

import { useCitySearch } from "@/hooks/useCitySearch";
import { useTTS } from "@/hooks/useTTS";

import { DestinyCard } from "@/components/DestinyCard";
import { NameCard } from "@/components/NameCard";
import { CitySearch } from "@/components/CitySearch";
import { SurnameSelector } from "@/components/SurnameSelector";

export default function Home() {
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

  const [phase, setPhase] = useState<"form" | "results">("form");
  const [baziResult, setBaziResult] = useState<BaziResult | null>(null);
  const [aiData, setAiData] = useState<ApiResponse | null>(null);
  const [isNamesLoading, setIsNamesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { playingNameIndex, handlePlayName } = useTTS();

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

    // Local BaZi calculation (with True Solar Time if city is selected)
    const city = selectedCity
      ? { longitude: selectedCity.longitude, timezone: selectedCity.timezone }
      : undefined;
    const result = calculateBazi(birthDate, birthTime, city);
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
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}` };
        }

        console.error("API Error:", {
          status: response.status,
          code: errorData.code,
          details: errorData.details,
        });

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
    } catch (e: unknown) {
      console.error("Request failed:", e);
      setError(
        e instanceof Error
          ? e.message
          : "The ancient oracle is momentarily silent. Please try again."
      );
    } finally {
      setIsNamesLoading(false);
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
          <DestinyCard baziResult={baziResult} />

          {/* NAME SUGGESTIONS */}
          <section>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-serif font-bold text-stone-900">
                Master&apos;s Selection
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
              {aiData?.names?.map((name, index) => (
                <NameCard
                  key={index}
                  name={name}
                  index={index}
                  playingNameIndex={playingNameIndex}
                  onPlayName={handlePlayName}
                />
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

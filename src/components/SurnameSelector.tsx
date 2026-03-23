"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";
import { COMMON_SURNAMES, type CommonSurname } from "@/lib/surnames";

interface SurnameSelectorProps {
  surnamePreference: "any" | "common" | "specified";
  setSurnamePreference: (pref: "any" | "common" | "specified") => void;
  surnameQuery: string;
  setSurnameQuery: (q: string) => void;
  selectedSurname: CommonSurname | null;
  setSelectedSurname: (s: CommonSurname | null) => void;
  surnameError: string | null;
  setSurnameError: (e: string | null) => void;
}

export function SurnameSelector({
  surnamePreference,
  setSurnamePreference,
  surnameQuery,
  setSurnameQuery,
  selectedSurname,
  setSelectedSurname,
  surnameError,
  setSurnameError,
}: SurnameSelectorProps) {
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

  return (
    <div className="mb-10">
      <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide mb-2">
        Surname Preference
      </label>
      <div className="space-y-3">
        {/* Option: Recommended by Master */}
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

        {/* Option: Specific surname */}
        <div
          className={`rounded-xl border overflow-hidden transition-all ${
            surnamePreference === "specified"
              ? "border-stone-900 ring-2 ring-stone-900 bg-stone-50"
              : "border-stone-200"
          }`}
        >
          <button
            type="button"
            onClick={() => setSurnamePreference("specified")}
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
                  <span className="w-4 h-4">&#9888;&#65039;</span>
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
  );
}

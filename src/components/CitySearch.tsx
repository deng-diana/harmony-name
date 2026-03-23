"use client";

import { MapPin, Loader2 } from "lucide-react";
import type { City } from "@/types";

interface CitySearchProps {
  cityQuery: string;
  cityResults: City[];
  isCityLoading: boolean;
  onSearch: (query: string) => void;
  onSelect: (city: City) => void;
}

export function CitySearch({
  cityQuery,
  cityResults,
  isCityLoading,
  onSearch,
  onSelect,
}: CitySearchProps) {
  return (
    <div className="mb-6 relative">
      <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide mb-2">
        Birth City
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder="Search city (e.g. London, New York)"
          value={cityQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-stone-900 focus:ring-2 focus:ring-stone-900 focus:border-transparent outline-none transition-all"
        />
        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        {isCityLoading && (
          <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-stone-400" />
        )}
      </div>

      {cityResults.length > 0 && (
        <div className="absolute z-20 w-full mt-2 bg-white border border-stone-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {cityResults.map((city) => (
            <button
              key={city.id}
              onClick={() => onSelect(city)}
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
  );
}

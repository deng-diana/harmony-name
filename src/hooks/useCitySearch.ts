"use client";

import { useState, useRef, useCallback } from "react";
import type { City } from "@/types";

export function useCitySearch() {
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [isCityLoading, setIsCityLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCitySearch = useCallback((query: string) => {
    setCityQuery(query);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 3) {
      setCityResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsCityLoading(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
        );
        const data = await res.json();
        setCityResults(data.results ?? []);
      } catch (e) {
        console.error("City search failed", e);
      } finally {
        setIsCityLoading(false);
      }
    }, 300);
  }, []);

  const selectCity = useCallback((city: City) => {
    setSelectedCity(city);
    setCityQuery(`${city.name}, ${city.country}`);
    setCityResults([]);
  }, []);

  return {
    cityQuery,
    cityResults,
    selectedCity,
    isCityLoading,
    handleCitySearch,
    selectCity,
  };
}

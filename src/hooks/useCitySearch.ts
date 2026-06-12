"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { City } from "@/types";

export function useCitySearch() {
  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [isCityLoading, setIsCityLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 取消在途请求 —— 否则慢的旧响应会覆盖新结果(下拉显示错城市 → 选错经度/时区 →
  // 真太阳时算错),query 退到 <3 字时在途请求返回也会把旧结果弹回来。
  const abortRef = useRef<AbortController | null>(null);

  // 卸载清理:清定时器 + 中止在途请求,避免对已卸载组件 setState。
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    },
    []
  );

  const handleCitySearch = useCallback((query: string) => {
    setCityQuery(query);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort(); // 中止上一次在途请求

    if (query.length < 3) {
      setCityResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const ac = new AbortController();
      abortRef.current = ac;
      setIsCityLoading(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`,
          { signal: ac.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (abortRef.current === ac) setCityResults(data.results ?? []);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.error("City search failed", e);
      } finally {
        if (abortRef.current === ac) setIsCityLoading(false);
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

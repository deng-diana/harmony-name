"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { speakChineseName, stopSpeaking } from "@/lib/tts";

export function useTTS() {
  const [playingNameIndex, setPlayingNameIndex] = useState<number | null>(null);
  // 播放令牌:点 A 播放中再点 B,A 的 await 被 stop 后 resolve,其 finally 不应清掉
  // B 的高亮。只有"令牌仍是自己"时才 setPlayingNameIndex(null)。也用 ref 读当前播放项,
  // 避免把 playingNameIndex 列进 useCallback 依赖而频繁重建回调。
  const tokenRef = useRef(0);
  const playingRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      // 用 addEventListener(可移除),不用全局单槽 onvoiceschanged 赋值(多实例互相覆盖+泄漏)。
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
        stopSpeaking();
      };
    }
    return () => stopSpeaking();
  }, []);

  const setPlaying = (i: number | null) => {
    playingRef.current = i;
    setPlayingNameIndex(i);
  };

  const handlePlayName = useCallback(async (hanzi: string, index: number) => {
    if (playingRef.current === index) {
      stopSpeaking();
      setPlaying(null);
      return;
    }

    stopSpeaking();
    const t = ++tokenRef.current;
    setPlaying(index);

    try {
      const cleanHanzi = hanzi.replace(/[{}]/g, "");
      await speakChineseName(cleanHanzi);
    } catch (error) {
      console.error("TTS playback failed:", error);
    } finally {
      if (tokenRef.current === t) setPlaying(null); // 仅当仍是本次播放才清
    }
  }, []);

  return { playingNameIndex, handlePlayName };
}

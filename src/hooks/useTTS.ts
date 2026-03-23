"use client";

import { useState, useEffect, useCallback } from "react";
import { speakChineseName, stopSpeaking } from "@/lib/tts";

export function useTTS() {
  const [playingNameIndex, setPlayingNameIndex] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      stopSpeaking();
    };
  }, []);

  const handlePlayName = useCallback(
    async (hanzi: string, index: number) => {
      if (playingNameIndex === index) {
        stopSpeaking();
        setPlayingNameIndex(null);
        return;
      }

      stopSpeaking();
      setPlayingNameIndex(index);

      try {
        const cleanHanzi = hanzi.replace(/[{}]/g, "");
        await speakChineseName(cleanHanzi);
      } catch (error) {
        console.error("TTS playback failed:", error);
      } finally {
        setPlayingNameIndex(null);
      }
    },
    [playingNameIndex]
  );

  return { playingNameIndex, handlePlayName };
}

/**
 * Generation progress indicator — shows each step of the AI naming pipeline live.
 *
 * Driven by the SSE stream's step/total/message. The stepper renders `totalSteps`
 * dots dynamically so it always matches whatever the server emits (the v2 pipeline
 * sends total = 5). Because steps can be long (the compose step alone can take ~45s),
 * a time-based intra-step animation eases the bar toward the next boundary so it
 * never looks frozen — it caps at the boundary until the real event arrives.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  BookOpen,
  Search,
  Sparkles,
  Scale,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/cn";

// v2 pipeline step map (1-indexed). Falls back to Sparkles/no-label if the server
// ever emits more steps than we have metadata for.
const STEP_META = [
  { icon: BookOpen, label: "Reading your chart" },
  { icon: Search, label: "Searching classical poems" },
  { icon: Sparkles, label: "Composing names" },
  { icon: Scale, label: "The review master judges" },
  { icon: PartyPopper, label: "Revealing" },
];

// Expected duration per step (ms) for the intra-step easing. The compose step
// (step 3) is by far the slowest, so give it a much longer runway.
const stepDurationMs = (step: number) => (step === 3 ? 45000 : 10000);

interface GenerationProgressProps {
  currentStep: number; // 1..totalSteps (0 = connecting)
  totalSteps: number; // from the SSE stream (5 for v2)
  message: string;
}

export function GenerationProgress({
  currentStep,
  totalSteps,
  message,
}: GenerationProgressProps) {
  const isDone = currentStep >= totalSteps && totalSteps > 0;

  // Segment boundaries for the current step, as percentages of the full bar.
  const segStart = (Math.max(currentStep - 1, 0) / totalSteps) * 100;
  const segEnd = (Math.max(currentStep, 0) / totalSteps) * 100;

  // Displayed fill %, eased over time toward the current step's boundary.
  const [displayPercent, setDisplayPercent] = useState(segStart);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // All setState calls go through requestAnimationFrame callbacks (never
    // synchronously in the effect body) to avoid cascading renders.
    if (isDone) {
      rafRef.current = requestAnimationFrame(() => setDisplayPercent(100));
      return () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      };
    }
    // Nothing to animate before the first real step arrives — snap to segment start.
    if (currentStep < 1) {
      rafRef.current = requestAnimationFrame(() => setDisplayPercent(segStart));
      return () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      };
    }

    const start = performance.now();
    const duration = stepDurationMs(currentStep);

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic — quick at first, then crawls, so it never hits the cap early
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayPercent(segStart + (segEnd - segStart) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // Re-run whenever the real step advances (new segment) or completion flips.
  }, [currentStep, segStart, segEnd, isDone]);

  const progressPercent = Math.round(displayPercent);

  return (
    <div className="py-12 px-8 bg-paper-raised rounded-2xl border border-mist/70 shadow-soft">
      {/* Thin progress bar; ink fill + ease-soft; shimmer overlay while running to feel alive */}
      <div className="relative w-full bg-mist rounded-full h-1 mb-10 overflow-hidden">
        <div
          className="bg-ink h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
        {!isDone && (
          <div className="shimmer absolute inset-0 rounded-full" aria-hidden />
        )}
      </div>

      {/* Stepper — driven by totalSteps so it always matches the server contract */}
      <div className="flex justify-between mb-10">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNum = index + 1;
          const meta = STEP_META[index];
          const Icon = meta?.icon ?? Sparkles;
          const isCompleted = currentStep > stepNum;
          const isCurrent = currentStep === stepNum;

          return (
            <div
              key={index}
              className={cn(
                "flex flex-col items-center gap-2 transition-soft duration-500",
                isCompleted ? "opacity-50" : isCurrent ? "opacity-100" : "opacity-25"
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-soft duration-500",
                  isCompleted
                    ? "bg-ink text-paper"
                    : isCurrent
                      ? "border-2 border-ink text-ink"
                      : "border border-mist text-ink-faint"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className={cn("w-4 h-4", isCurrent && "animate-pulse")} />
                )}
              </div>
              <span className="text-[10px] font-medium tracking-wider uppercase hidden sm:block text-ink text-center max-w-[5.5rem] leading-tight">
                {meta?.label ?? ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* Live status text — uses the server-sent message; quiet spinner + pulsing ellipsis */}
      <div className="text-center">
        {!isDone ? (
          <div className="flex items-center justify-center gap-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-ink-faint" />
            <p className="text-ink-soft">
              {message}
              <span className="ml-0.5 inline-block animate-pulse">…</span>
            </p>
          </div>
        ) : (
          <p className="text-ink font-semibold">{message}</p>
        )}
        <p className="text-xs text-ink-faint mt-2 font-mono tracking-wide">
          Step {Math.max(currentStep, 0)} of {totalSteps}
        </p>
      </div>
    </div>
  );
}

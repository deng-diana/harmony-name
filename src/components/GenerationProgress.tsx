/**
 * 生成进度指示器 — 实时显示 AI 取名的每一步
 *
 * 接收来自 SSE stream 的 step/total/message,以 stepper + 进度条展示。
 * 设计:取名耗时可达数分钟,且步骤间隔长(进度百分比长时间不变),故在已完成的
 * 进度条上叠一层【流动微光】,让"等待"显得"活着"而非卡死;活动步骤柔和呼吸。
 */
"use client";

import { Loader2, CheckCircle2, BookOpen, Search, Sparkles, PartyPopper } from "lucide-react";
import { cn } from "@/lib/cn";

const STEP_CONFIG = [
  { icon: BookOpen, label: "Analyzing Destiny" },
  { icon: Search, label: "Searching Poems" },
  { icon: Sparkles, label: "Crafting Names" },
  { icon: PartyPopper, label: "Complete" },
];

interface GenerationProgressProps {
  currentStep: number; // 1-4
  totalSteps: number; // 4
  message: string;
}

export function GenerationProgress({
  currentStep,
  totalSteps,
  message,
}: GenerationProgressProps) {
  const progressPercent = Math.round((currentStep / totalSteps) * 100);
  const isDone = currentStep >= totalSteps;

  return (
    <div className="py-12 px-8 bg-paper-raised rounded-2xl border border-mist/70 shadow-soft">
      {/* 进度条:填充用墨色,加 ease-soft 过渡;未完成时叠流动微光显"活着" */}
      <div className="relative w-full bg-mist rounded-full h-1.5 mb-8 overflow-hidden">
        <div
          className="bg-ink h-full rounded-full transition-[width] duration-700 ease-soft"
          style={{ width: `${progressPercent}%` }}
        />
        {!isDone && (
          <div className="shimmer absolute inset-0 rounded-full" aria-hidden />
        )}
      </div>

      {/* Stepper 步骤指示 */}
      <div className="flex justify-between mb-8">
        {STEP_CONFIG.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = currentStep > stepNum;
          const isCurrent = currentStep === stepNum;
          const Icon = step.icon;

          return (
            <div
              key={index}
              className={cn(
                "flex flex-col items-center gap-2 transition-soft",
                isCompleted ? "text-ink" : isCurrent ? "text-ink" : "text-ink-faint/60"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-soft",
                  isCompleted
                    ? "bg-ink text-paper"
                    : isCurrent
                      ? "bg-gold-soft/25 text-ink ring-2 ring-gold animate-pulse"
                      : "bg-mist/50 text-ink-faint/60"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span className="text-[10px] font-medium tracking-wide uppercase hidden sm:block">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* 当前状态文字 */}
      <div className="text-center">
        {!isDone ? (
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
            <p className="text-ink-soft font-medium">{message}</p>
          </div>
        ) : (
          <p className="text-ink font-semibold">{message}</p>
        )}
        <p className="text-xs text-ink-faint mt-2">
          Step {currentStep} of {totalSteps}
        </p>
      </div>
    </div>
  );
}

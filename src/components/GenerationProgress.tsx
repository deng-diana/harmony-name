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
      {/* 极细进度条(参考:克制);填充墨色 + ease-soft;未完成时叠微光显"活着" */}
      <div className="relative w-full bg-mist rounded-full h-1 mb-10 overflow-hidden">
        <div
          className="bg-ink h-full rounded-full transition-[width] duration-700 ease-soft"
          style={{ width: `${progressPercent}%` }}
        />
        {!isDone && (
          <div className="shimmer absolute inset-0 rounded-full" aria-hidden />
        )}
      </div>

      {/* Stepper:完成=填充墨+对勾,进行中=描边墨,待办=淡(纯靠透明度区分,不喧哗) */}
      <div className="flex justify-between mb-10">
        {STEP_CONFIG.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = currentStep > stepNum;
          const isCurrent = currentStep === stepNum;
          const Icon = step.icon;

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
              <span className="text-[10px] font-medium tracking-wider uppercase hidden sm:block text-ink">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* 当前状态文字 —— 安静:小号转圈 + 省略号脉冲,不抢戏 */}
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
          Step {currentStep} of {totalSteps}
        </p>
      </div>
    </div>
  );
}

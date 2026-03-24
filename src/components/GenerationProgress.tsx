/**
 * 生成进度指示器 — 实时显示 AI 取名的每一步
 *
 * 接收来自 SSE stream 的 step/total/message，
 * 以 stepper + 进度条的形式展示给用户
 */
"use client";

import { Loader2, CheckCircle2, BookOpen, Search, Sparkles, PartyPopper } from "lucide-react";

/** 每一步对应的图标和颜色 */
const STEP_CONFIG = [
  { icon: BookOpen,     label: "Analyzing Destiny" },
  { icon: Search,       label: "Searching Poems" },
  { icon: Sparkles,     label: "Crafting Names" },
  { icon: PartyPopper,  label: "Complete" },
];

interface GenerationProgressProps {
  currentStep: number;   // 1-4
  totalSteps: number;    // 4
  message: string;       // 当前步骤描述
}

export function GenerationProgress({
  currentStep,
  totalSteps,
  message,
}: GenerationProgressProps) {
  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="py-12 px-8 bg-white rounded-2xl border border-stone-100">
      {/* 进度条 */}
      <div className="w-full bg-stone-100 rounded-full h-1.5 mb-8 overflow-hidden">
        <div
          className="bg-stone-800 h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
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
              className={`flex flex-col items-center gap-2 transition-all duration-500 ${
                isCompleted
                  ? "text-stone-800"
                  : isCurrent
                    ? "text-stone-900"
                    : "text-stone-300"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isCompleted
                    ? "bg-stone-800 text-white"
                    : isCurrent
                      ? "bg-stone-100 text-stone-800 ring-2 ring-stone-800"
                      : "bg-stone-50 text-stone-300"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isCurrent ? (
                  <Icon className="w-5 h-5 animate-pulse" />
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
        {currentStep < totalSteps ? (
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
            <p className="text-stone-600 font-medium">{message}</p>
          </div>
        ) : (
          <p className="text-stone-800 font-semibold">{message}</p>
        )}
        <p className="text-xs text-stone-400 mt-2">
          Step {currentStep} of {totalSteps}
        </p>
      </div>
    </div>
  );
}

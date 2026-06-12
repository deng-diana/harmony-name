import { type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Card —— 设计系统卡片容器。纸面抬起 + 雾色描边 + 暖色柔光阴影。
 * interactive 为 true 时:hover 抬升(阴影加深 + 极轻微上浮),用于可点的卡片。
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-paper-raised rounded-2xl border border-mist/70 shadow-soft",
        interactive &&
          "transition-soft hover:shadow-soft-lifted hover:-translate-y-0.5 cursor-pointer",
        className
      )}
      {...props}
    />
  );
}

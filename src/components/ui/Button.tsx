import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Button —— 设计系统核心按钮。统一品牌色、形状、动效、焦点态、禁用/加载态。
 * 用法: <Button variant="primary" size="lg" loading={isLoading}>…</Button>
 * 调用方仍可传 className 覆盖(twMerge 安全合并)。
 */
type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // 墨底白字 —— 主行动(生成名字等)
  primary: "bg-ink text-paper hover:bg-ink-soft shadow-soft hover:shadow-soft-lifted",
  // 纸面描边 —— 次行动(返回/再来一次)
  secondary:
    "bg-paper-raised text-ink border border-mist hover:border-gold-soft hover:shadow-soft",
  // 无底 —— 弱行动(文字按钮)
  ghost: "text-ink-soft hover:text-ink hover:bg-mist/60",
};

const SIZES: Record<Size, string> = {
  sm: "px-4 py-2 text-sm rounded-lg gap-1.5",
  md: "px-6 py-3 text-base rounded-xl gap-2",
  lg: "px-8 py-4 text-lg rounded-2xl gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, type, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"} // 设计系统默认 button,防 <form> 内误触发提交
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center font-medium select-none",
        // 动效:颜色/阴影/形变统一过渡;点击轻微回弹(spring),不再用 transition-all
        "transition-soft active:scale-[0.98]",
        // 焦点态(键盘可达性):暖金描边环
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        // 禁用/加载
        "disabled:opacity-60 disabled:pointer-events-none disabled:active:scale-100",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

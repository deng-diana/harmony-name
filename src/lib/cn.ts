import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn —— 合并 className 的标准工具(设计系统基石)。
 * clsx:支持条件类名(对象/数组/假值过滤);twMerge:解决 Tailwind 类冲突
 * (后者覆盖前者,如 cn("px-2","px-4") → "px-4"),让组件的 variant + 调用方
 * 传入的 className 能安全叠加而不互相打架。
 *
 * 用法:className={cn("base classes", isActive && "active classes", props.className)}
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

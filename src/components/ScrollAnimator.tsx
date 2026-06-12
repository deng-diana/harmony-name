"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Client-side wrapper that:
 * 1. Adds IntersectionObserver-based scroll animations to .scroll-animate elements
 * 2. Manages header scroll state via data attribute on root element
 */
export function ScrollAnimator({ children }: { children: React.ReactNode }) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // 进场:元素入视口即播放 fade-in-up 关键帧(动画自带初末态,无需 transition-all)。
    // 进场后立即 unobserve —— 一次性、不重复触发、省开销。
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up");
            entry.target.classList.remove("opacity-0");
            observerRef.current?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" }
    );

    rootRef.current?.querySelectorAll(".scroll-animate").forEach((el) => {
      el.classList.add("opacity-0"); // 初始隐藏(keyframe from 负责上浮),防首屏闪现
      observerRef.current?.observe(el);
    });

    // header 滚动态:rAF 节流 + passive,避免每帧 setState/阻塞滚动。
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 50);
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-scrolled={scrolled ? "true" : "false"}
      className="bg-paper font-sans text-ink overflow-x-hidden"
    >
      {children}
    </div>
  );
}

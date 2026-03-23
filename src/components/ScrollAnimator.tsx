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
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up");
            entry.target.classList.remove("opacity-0", "translate-y-10");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    rootRef.current
      ?.querySelectorAll(".scroll-animate")
      .forEach((el) => {
        el.classList.add(
          "opacity-0",
          "translate-y-10",
          "transition-all",
          "duration-700"
        );
        observerRef.current?.observe(el);
      });

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-scrolled={scrolled ? "true" : "false"}
      className="bg-[#FDFBF7] font-sans text-stone-900 overflow-x-hidden"
    >
      {children}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export function StickyHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-[padding,background-color,border-color,backdrop-filter] duration-300 ease-soft ${
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-stone-100 py-2"
          : "py-4"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <Image
              src="/logo.png"
              alt="HarmonyName Logo"
              fill
              className="object-contain"
            />
          </div>
          <span className="font-serif text-xl font-bold tracking-tight text-stone-900">
            HarmonyName
          </span>
        </div>

        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="text-sm text-stone-600 hover:text-stone-900 transition-colors hidden sm:inline"
          >
            Sign in
          </Link>
          <Link href="/app">
            <button className="px-6 py-2.5 rounded-full bg-stone-900 text-white hover:bg-stone-800 transition-colors duration-300 font-medium text-sm shadow-lg">
              Find my name
            </button>
          </Link>
        </div>
      </nav>
    </header>
  );
}

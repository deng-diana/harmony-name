"use client";

/**
 * 充值包卡片 (Phase 7) —— 点 Buy → 调 /api/checkout → 跳转到 Stripe 支付页。
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { CREDIT_PACKS } from "@/lib/creditPacks";

export function BuyPacks() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const buy = async (packId: string) => {
    setBusy(packId);
    track("checkout_started", { packId });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.assign(data.url); // 跳到 Stripe 托管的支付页
        return;
      }
      setBusy(null);
    } catch {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="grid sm:grid-cols-3 gap-6">
        {CREDIT_PACKS.map((p) => (
        <div
          key={p.id}
          className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col items-center text-center hover:shadow-lg transition"
        >
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3">
            {p.label}
          </div>
          <div className="text-5xl font-serif text-stone-900 leading-none">
            {p.credits}
          </div>
          <div className="text-sm text-stone-500 mt-1 mb-5">naming credits</div>
          <div className="text-2xl font-bold text-stone-900 mb-5">
            ${(p.amount / 100).toFixed(0)}
          </div>
          <button
            onClick={() => buy(p.id)}
            disabled={busy !== null}
            className="w-full bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-stone-800 active:scale-[0.98] transition disabled:opacity-50"
          >
            {busy === p.id ? "Redirecting…" : "Buy"}
          </button>
        </div>
        ))}
      </div>
      <p className="text-center text-xs text-stone-400 mt-6">
        By purchasing you agree to our{" "}
        <Link href="/terms" className="underline hover:text-stone-600">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/refund" className="underline hover:text-stone-600">
          Refund Policy
        </Link>
        .
      </p>
    </>
  );
}

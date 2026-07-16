/**
 * /api/checkout —— 创建 Stripe Checkout 下单会话
 * ===============================================
 * 登录用户选一个积分包 → 这里创建一个 Stripe 托管的支付页 → 返回 url,前端跳过去付。
 * 用户付完后,真正"到账加积分"由 /api/webhooks/stripe 负责(那才是可信入账点)。
 *
 * 关键: 把 userId 和 credits 放进 session.metadata,webhook 据此知道给谁加多少分。
 */
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { getPack } from "@/lib/creditPacks";
import { checkoutRatelimit } from "@/lib/ratelimit";
import { z } from "zod";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const checkoutBodySchema = z.object({ packId: z.string().max(32) });

export async function POST(request: Request) {
  if (!stripe) {
    return Response.json(
      { error: "Payments are not configured", code: "ENV_MISSING" },
      { status: 500 }
    );
  }

  // 必须登录(要知道给谁加积分)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: "Please sign in", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  // Rate-limit checkout session creation per user (skip if Upstash unconfigured).
  if (checkoutRatelimit) {
    const { success } = await checkoutRatelimit.limit(user.id);
    if (!success) {
      return Response.json(
        { error: "Too many requests, please slow down.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }
  }

  // Parse + validate the body (never trust its shape). Matches /api/generate.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const parsed = checkoutBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const pack = getPack(parsed.data.packId);
  if (!pack) {
    return Response.json(
      { error: "Invalid pack", code: "INVALID_PACK" },
      { status: 400 }
    );
  }

  // Never trust the client Origin header for redirect URLs (an attacker could
  // point success/cancel at their own site). In prod, pin the canonical domain;
  // in dev/preview fall back to the request's own origin.
  const origin =
    process.env.VERCEL_ENV === "production"
      ? SITE_URL
      : new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: pack.amount,
          product_data: {
            name: `HarmonyName · ${pack.credits} naming credits`,
          },
        },
      },
    ],
    // Digital goods delivered immediately: tell the buyer they agree to the
    // Terms and waive the 14-day EU/UK cancellation right once credits land.
    // NOTE: consent_collection.terms_of_service = "required" also needs a Terms
    // URL configured in the Stripe dashboard, or session creation FAILS. Until
    // that's set, we ship only custom_text (safe) and leave consent_collection
    // off — enable it after the dashboard Terms URL is configured.
    custom_text: {
      submit: {
        message:
          "By purchasing you agree to our Terms and request immediate delivery of credits, acknowledging that you lose the 14-day cancellation right once credits are delivered.",
      },
    },
    success_url: `${origin}/app?purchase=success`,
    cancel_url: `${origin}/app?purchase=cancelled`,
    client_reference_id: user.id,
    metadata: {
      userId: user.id,
      credits: String(pack.credits),
      packId: pack.id,
    },
  });

  return Response.json({ url: session.url });
}

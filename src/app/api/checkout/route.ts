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

export const dynamic = "force-dynamic";

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

  const { packId } = await request.json();
  const pack = getPack(packId);
  if (!pack) {
    return Response.json(
      { error: "Invalid pack", code: "INVALID_PACK" },
      { status: 400 }
    );
  }

  const origin =
    request.headers.get("origin") ?? new URL(request.url).origin;

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

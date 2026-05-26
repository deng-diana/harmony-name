/**
 * /api/webhooks/stripe —— Stripe 付款成功后的回调(真正的"到账"点)
 * ================================================================
 * 为什么不在前端/success 页面加积分? success 页面可被伪造/跳过,不可信。
 * Stripe 直接、带【签名】地把"付款成功"事件 POST 到这里,验签通过才加分 —— 不可伪造。
 *
 * 两个铁律:
 *  1. 必须用【原始请求体】验签(request.text(),不能 request.json())。
 *  2. 必须【幂等】:Stripe 可能重试同一事件,用 event.id 去重,避免重复加分。
 */
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redis } from "@/lib/redis";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  // ① 原始 body + 验签
  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // ② 只处理"结账完成"
  if (event.type === "checkout.session.completed") {
    // 幂等:同一 event 只处理一次(NX 写入成功才是首次)
    if (redis) {
      const fresh = await redis.set(`stripe:evt:${event.id}`, "1", {
        nx: true,
        ex: 60 * 60 * 24 * 7, // 7 天
      });
      if (fresh === null) {
        return new Response("Already processed", { status: 200 });
      }
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const credits = Number(session.metadata?.credits);

    if (userId && credits > 0) {
      const { error } = await supabaseAdmin.rpc("add_credits", {
        p_user_id: userId,
        p_amount: credits,
      });
      if (error) {
        // 返回非 2xx → Stripe 会自动重试(此时幂等键已写,需放行重试:删掉键)
        if (redis) await redis.del(`stripe:evt:${event.id}`);
        console.error("add_credits failed in webhook:", error.message);
        return new Response("DB error", { status: 500 });
      }
    }
  }

  return new Response("ok", { status: 200 });
}

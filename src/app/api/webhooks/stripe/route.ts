/**
 * /api/webhooks/stripe —— Stripe 付款成功后的回调(真正的"到账"点)
 * ================================================================
 * 为什么不在前端/success 页面加积分? success 页面可被伪造/跳过,不可信。
 * Stripe 直接、带【签名】地把"付款成功"事件 POST 到这里,验签通过才加分 —— 不可伪造。
 *
 * 三个铁律:
 *  1. 必须用【原始请求体】验签(request.text(),不能 request.json())。
 *  2. 必须【幂等】:Stripe 可能重试同一事件,用 event.id 去重(DB 持久,不依赖 Redis)。
 *  3. 必须【确认真到账】:只在 payment_status === "paid" 时才发积分。
 */
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
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
    const session = event.data.object as Stripe.Checkout.Session;
    const admin = getSupabaseAdmin();

    // ②.a 真到账校验:异步支付方式下 completed 可能在 payment_status 仍为 unpaid 时触发。
    //      未真正付款绝不发积分(真到账会有后续 async_payment_succeeded 事件,Stripe 会重投)。
    if (session.payment_status !== "paid") {
      return new Response("ok", { status: 200 });
    }

    // ②.b 幂等(DB 持久):首次插入 event_id 成功才是首次处理;唯一冲突 = 已处理过。
    //      不依赖 Redis(可选/可能没配),从根上堵住"重试 → 重复发积分 → 漏钱"。
    const { error: dupeErr } = await admin
      .from("stripe_processed_events")
      .insert({ event_id: event.id });
    if (dupeErr) {
      if (dupeErr.code === "23505") {
        // unique_violation = 这个事件已经处理过了,幂等放行。
        return new Response("Already processed", { status: 200 });
      }
      if (dupeErr.code === "42P01") {
        // 表还没建(迁移 009 未跑)→ 优雅降级:不强幂等、照常发积分(等同旧 Redis-less
        // 行为,不比现状更差),避免"代码先上、迁移没跑 → 所有购买 500 发不了积分"。
        // 跑完 009 后强幂等自动生效。
        console.warn("stripe_processed_events missing — run migration 009 to enable idempotency");
      } else {
        // 其它 DB 错(瞬时)→ 500 让 Stripe 重试,不放过这笔。
        console.error("idempotency insert failed:", dupeErr.message);
        return new Response("DB error", { status: 500 });
      }
    }

    // ②.c 发积分
    const userId = session.metadata?.userId;
    const credits = Number(session.metadata?.credits);
    if (userId && credits > 0) {
      const { error } = await admin.rpc("add_credits", {
        p_user_id: userId,
        p_amount: credits,
      });
      if (error) {
        // 加分失败 → 删掉幂等记录,让 Stripe 重试时能重新处理(否则这笔积分永久丢失)。
        await admin.from("stripe_processed_events").delete().eq("event_id", event.id);
        console.error("add_credits failed in webhook:", error.message);
        return new Response("DB error", { status: 500 });
      }
    }
  }

  return new Response("ok", { status: 200 });
}

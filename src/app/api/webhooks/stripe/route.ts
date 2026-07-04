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
import * as Sentry from "@sentry/nextjs";
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

    // ②.b Read the grant target FIRST so we can validate before touching the DB.
    const userId = session.metadata?.userId;
    const credits = Number(session.metadata?.credits);
    if (!userId || !(credits > 0)) {
      // Missing/garbage metadata: we cannot know who to credit or how much.
      // This should never happen for a session we created — surface it loudly
      // (a mis-shaped checkout, a manual Stripe dashboard payment, etc.).
      Sentry.captureException(
        new Error("Stripe webhook: paid session with missing/invalid metadata"),
        { extra: { eventId: event.id, userId, credits: session.metadata?.credits } }
      );
      // Ack so Stripe stops retrying an event we can never satisfy.
      return new Response("ok", { status: 200 });
    }

    // ②.c 原子发积分(幂等 + 加分在一个事务里,消除并发重试丢积分的竞态)。
    //      首选 process_stripe_credit RPC(迁移 012);它一步完成"占位去重 + 加分",
    //      返回 true = 首次处理并已加分,false = 之前已处理过(幂等放行)。
    const { data: granted, error: rpcErr } = await admin.rpc(
      "process_stripe_credit",
      { p_event_id: event.id, p_user_id: userId, p_credits: credits }
    );

    if (rpcErr) {
      // 迁移 012 尚未在生产库执行 → 函数不存在。Postgres 报 42883
      // (undefined_function),PostgREST 包一层报 PGRST202(找不到该 RPC)。
      // 两个 code 都兜住,回退到旧的"插入去重 + add_credits"路径(不改其语义),
      // 保证在手动跑 SQL 之前线上照常发积分;同时上报,提醒尽快执行 012。
      if (rpcErr.code === "42883" || rpcErr.code === "PGRST202") {
        Sentry.captureMessage(
          "migration 012 not applied — webhook running on legacy non-atomic path",
          { level: "warning", extra: { eventId: event.id } }
        );
        return await legacyGrant(admin, event.id, userId, credits);
      }
      // 其它 DB 错(瞬时)→ 500 让 Stripe 重试,不放过这笔。
      console.error("process_stripe_credit failed:", rpcErr.message);
      return new Response("DB error", { status: 500 });
    }

    if (granted === false) {
      // 该事件之前已处理过(幂等),不重复发分。
      return new Response("Already processed", { status: 200 });
    }
  }

  return new Response("ok", { status: 200 });
}

/**
 * Legacy fallback (pre-012): non-atomic insert-dedupe + add_credits.
 * Kept ONLY so prod keeps granting credits before migration 012 is run
 * manually. Once 012 is applied this branch is never taken.
 */
async function legacyGrant(
  admin: ReturnType<typeof getSupabaseAdmin>,
  eventId: string,
  userId: string,
  credits: number
): Promise<Response> {
  const { error: dupeErr } = await admin
    .from("stripe_processed_events")
    .insert({ event_id: eventId });
  if (dupeErr) {
    if (dupeErr.code === "23505") {
      // unique_violation = already processed, idempotent pass-through.
      return new Response("Already processed", { status: 200 });
    }
    if (dupeErr.code === "42P01") {
      // stripe_processed_events table missing (migration 009 not applied).
      // 009 IS confirmed applied in prod, so this should never happen —
      // fail CLOSED (500) so Stripe retries rather than silently granting
      // with no idempotency (which risked double-credit on retries).
      Sentry.captureException(
        new Error("stripe_processed_events missing — migration 009 not applied"),
        { extra: { eventId } }
      );
      return new Response("DB error", { status: 500 });
    }
    // Other (transient) DB error -> 500 so Stripe retries.
    console.error("idempotency insert failed:", dupeErr.message);
    return new Response("DB error", { status: 500 });
  }

  const { data, error } = await admin.rpc("add_credits", {
    p_user_id: userId,
    p_amount: credits,
  });
  // add_credits returns NULL (not an error) when the profile row is missing —
  // it grants nothing. Treat a null/undefined return as a failed grant too, or
  // the idempotency row would commit and a paying user's credits vanish.
  if (error || data == null) {
    // Grant failed -> delete the idempotency row so a Stripe retry can
    // re-process (otherwise these credits are lost forever).
    await admin.from("stripe_processed_events").delete().eq("event_id", eventId);
    if (error) {
      console.error("add_credits failed in webhook:", error.message);
    } else {
      Sentry.captureException(
        new Error("add_credits returned null — profile row missing, no credits granted"),
        { extra: { eventId, userId } }
      );
    }
    return new Response("DB error", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}

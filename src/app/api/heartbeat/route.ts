/**
 * /api/heartbeat — keep the Supabase database "warm"
 * ===================================================
 * Supabase pauses a free project after 7 days with zero activity. This route
 * runs one tiny read against the DB so the project never goes idle. A Vercel
 * Cron Job (see vercel.json) calls it on a schedule — no human needs to remember.
 *
 * Security: Vercel sends `Authorization: Bearer <CRON_SECRET>` when it invokes a
 * cron, IF the CRON_SECRET env var is set. We reject any caller that does not
 * present it, so random bots cannot trigger our DB query. If CRON_SECRET is unset
 * (e.g. local dev), the check is skipped so it still works on your machine.
 */
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Never cache this — every call must actually hit the database.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // 1) Gate: only Vercel's cron (which knows the secret) may run this.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.VERCEL_ENV === "production") {
    // Fail closed in prod: CRON_SECRET IS set there, so a missing secret means
    // misconfiguration — reject rather than expose an unauthenticated DB touch.
    // Local dev (no VERCEL_ENV) stays permissive so it works on your machine.
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) The heartbeat itself: read a single id from the poems table.
  //    `head: true` means "don't send the rows back, just run the query" —
  //    the cheapest possible touch that still counts as real activity.
  try {
    const { error } = await getSupabaseAdmin()
      .from("poems")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true, pingedAt: new Date().toISOString() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

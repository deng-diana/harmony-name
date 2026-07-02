/**
 * /api/generate — SSE Streaming 版本 (已接入鉴权 + 积分)
 *
 * 请求生命周期:
 *   ① 鉴权        未登录 → 401 (直接拒绝,不进流)
 *   ② 校验请求体  非法 → 400
 *   ③ 扣 1 分     余额不足 → 402 (不调用任何 AI,省钱)
 *   ④ SSE 流式生成 (RAG → Claude)
 *   ⑤ 生成失败 → 退还 1 分 (绝不让用户白白扣钱)
 *
 * 设计要点: "能不能开始"用 HTTP 状态码(401/400/402)同步返回;
 *           真正的进度/结果再走 SSE 流。
 */
import { getClaude } from "@/lib/claude";
import { NAMING_MODEL } from "@/lib/model";
import { searchPoems } from "@/lib/retriever";
import { generateRequestSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { deductCredit, refundCredit } from "@/lib/credits";
import { generateRatelimit, generateIpRatelimit } from "@/lib/ratelimit";
import * as Sentry from "@sentry/nextjs";
import {
  createSystemPromptStatic,
  buildPoemsBlock,
  buildUserMessage,
  buildSurnameInstruction,
} from "@/lib/prompt";
import { runNamingPipeline } from "@/lib/pipeline/orchestrate";

// 命名管线 v2 总开关:仅当环境变量为 "true" 时启用接地多智能体管线;
// 否则走旧的"单次 Claude + 提示词接地"路径(安全回退,不影响线上)。
const PIPELINE_V2 = process.env.NAMING_PIPELINE_V2 === "true";

// 流式 AI 生成可能耗时;放宽超时(Vercel 平台默认上限现为 300s)。
// 运行时保持 Node(默认,Fluid Compute)——不要用 Edge。
export const maxDuration = 300;

/** 进度步骤 (校验已移到流外,故只剩 3 步) */
const STEPS = {
  RAG:      { step: 1, total: 3, message: "Searching ancient poetry archives..." },
  GENERATE: { step: 2, total: 3, message: "The naming master is contemplating..." },
  DONE:     { step: 3, total: 3, message: "Names revealed!" },
};

const ELEMENT_IMAGERY: Record<string, string> = {
  Wood: "春天 生长 树木 青翠 仁德 东风",
  Fire: "光明 热情 朝阳 辉煌 礼仪 南方",
  Earth: "大地 厚德 稳重 丰收 信义 中央",
  Metal: "秋天 坚毅 清白 明月 义气 西方",
  Water: "流水 智慧 深远 润泽 冬天 北方",
};

export async function POST(request: Request) {
  if (!process.env.CLAUDE_API_KEY) {
    return Response.json(
      { error: "Server configuration error", code: "ENV_MISSING" },
      { status: 500 }
    );
  }

  // ===== ① 鉴权 =====
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { error: "Please sign in to generate names", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  // ===== ①.5 限流(防刷/防爆发烧钱)=====
  // 生产环境【必须】有限流器。Upstash 在生产已配置,若这里为 null 说明配置漏了 →
  // 【fail closed】(503)而非无限放行,避免"限流静默失效 → 被刷爆 AI 额度烧钱"。
  // 本地/预览无 Upstash 时保持跳过(下面 if 分支自然不进)。
  if (process.env.VERCEL_ENV === "production" && (!generateRatelimit || !generateIpRatelimit)) {
    Sentry.captureMessage(
      "Rate limiter unconfigured in production — /api/generate failing closed",
      { level: "error" }
    );
    return Response.json(
      { error: "Service temporarily unavailable", code: "RATE_LIMITER_UNCONFIGURED" },
      { status: 503 }
    );
  }
  // 双闸:按用户 id 限流 + 按来源 IP 限流(后者堵"多小号刷免费额度")。
  if (generateRatelimit) {
    const { success } = await generateRatelimit.limit(user.id);
    if (!success) {
      return Response.json(
        { error: "Too many requests, please slow down.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }
  }
  if (generateIpRatelimit) {
    // Trust the platform-injected x-real-ip first. On Vercel proxies APPEND the
    // real client IP to x-forwarded-for, so the FIRST hop is client-spoofable —
    // take the LAST entry instead. "unknown" is a shared-bucket last resort.
    const xff = request.headers.get("x-forwarded-for");
    const ip =
      request.headers.get("x-real-ip")?.trim() ||
      xff?.split(",").pop()?.trim() ||
      "unknown";
    const { success } = await generateIpRatelimit.limit(ip);
    if (!success) {
      return Response.json(
        { error: "Too many requests, please slow down.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }
  }

  // ===== ② 校验请求体 =====
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const parseResult = generateRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return Response.json(
      { error: "Invalid request", code: "VALIDATION_ERROR", details: parseResult.error.issues },
      { status: 400 }
    );
  }
  const {
    gender,
    dayMaster,
    strength,
    favourableElements,
    avoidElements,
    surnamePreference,
    specifiedSurname,
    recommendedNameLength,
  } = parseResult.data;

  // ===== ③ 扣分 (先扣后用) =====
  const deduction = await deductCredit(supabase);
  if (!deduction.ok) {
    if (deduction.code === "INSUFFICIENT_CREDITS") {
      return Response.json(
        { error: "You're out of credits", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }
    return Response.json(
      { error: "Failed to process request", code: "CREDIT_ERROR" },
      { status: 500 }
    );
  }
  const creditsRemaining = deduction.remaining;

  // ===== ④ 开始 SSE 流 =====
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // sendEvent MUST NEVER THROW: once the client disconnects, writer.write() rejects.
  // If that rejection escaped into failAndRefund / the catch, it would re-reject on a
  // dead writer and surface as an unhandledRejection. So we swallow write failures
  // here and return a boolean the caller may inspect.
  const sendEvent = async (
    type: string,
    payload: Record<string, unknown>
  ): Promise<boolean> => {
    try {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
      );
      return true;
    } catch {
      return false; // client gone / writer closed — never throw from an SSE write
    }
  };

  // SSE keepalive: the Composer call can run 30–60s with no progress event, and idle
  // proxies kill silent streams. A comment frame (starts with ":") is NOT a data event
  // — the client parser splits on "\n\n" then looks for a "data: " line, so it ignores
  // these. Fire every 15s; cleared in finally. Never throws (fire-and-forget catch).
  const keepaliveTimer = setInterval(() => {
    writer.write(encoder.encode(`: keepalive\n\n`)).catch(() => {});
  }, 15_000);

  (async () => {
    let refunded = false;
    // Flip to true the instant the pipeline yields real names — BEFORE archive/result
    // write. Guards the post-success disconnect loophole: if a later step (archive or
    // the result write) fails because the client left, the user already earned their
    // result, so we must NOT refund on that path (see the catch below).
    let generationSucceeded = false;
    // 失败统一出口: 退款 + 推送 error 事件(并把退还后的余额带给前端)。
    // sendEvent 已保证不抛,故这里的 await 不会因客户端断开而 reject。
    const failAndRefund = async (payload: Record<string, unknown>) => {
      if (!refunded) {
        await refundCredit(user.id);
        refunded = true;
      }
      await sendEvent("error", { ...payload, creditsRemaining: creditsRemaining + 1 });
    };

    try {
      const surnameInstruction = buildSurnameInstruction(
        surnamePreference,
        specifiedSurname,
        dayMaster
      );

      let parsed: unknown;

      if (PIPELINE_V2) {
        // ===== v2:接地多智能体管线(取名先生 → 校验 → 按编号回填真出处)=====
        const result = await runNamingPipeline(
          {
            gender,
            dayMaster,
            strength,
            favourableElements,
            avoidElements,
            recommendedNameLength,
            surnameInstruction,
            // 用户指定了姓(specified 直选 / from_common 从常见姓列表挑)→ 把姓字
            // 传进去,让 deterministic 救援能用上。auto 模式下保持 undefined,让
            // 取名先生自选,救援层若一无所获再走 FALLBACK_SURNAME 兜底。
            surnameChar:
              (surnamePreference === "specified" ||
                surnamePreference === "from_common") &&
              specifiedSurname
                ? specifiedSurname
                : undefined,
          },
          {
            onProgress: (step, total, message) => {
              // fire-and-forget;sendEvent 已吞掉写失败,不会变成 unhandledRejection。
              void sendEvent("progress", { step, total, message });
            },
            // Cancel in-flight LLM calls when the client disconnects (stop paying).
            signal: request.signal,
            // Escalate SILENT LLM degradations (swallowed Composer/Critic API errors)
            // to Sentry — orchestrate.ts stays Sentry-free and calls back through here.
            onError: (err, stage) => {
              Sentry.captureException(err, { tags: { pipeline_stage: stage } });
            },
          }
        );
        if (!result.names || result.names.length === 0) {
          await failAndRefund({
            error: "Couldn't compose verified names this time",
            code: "NO_VERIFIED_NAMES",
          });
          return; // writer.close() 走 finally,避免重复 close 触发 TypeError
        }
        parsed = result;
      } else {
        // ===== 旧路径:单次 Claude + 仅靠提示词接地(flag 关闭时保留)=====
        await sendEvent("progress", STEPS.RAG);
        let poemsContextText = "";
        try {
          const imageryWords = favourableElements
            .map((el: string) => ELEMENT_IMAGERY[el] || el)
            .join(" ");
          const retrievedPoems = await searchPoems(`中国古典诗词 ${imageryWords}`, 15);
          const FAME_LABEL: Record<number, string> = { 3: "⭐经典名篇", 2: "⭐名家作品", 1: "其他" };
          poemsContextText = retrievedPoems
            .map(
              (p, i) =>
                `[${i + 1}] [${FAME_LABEL[p.fameScore] || "其他"}] 《${p.title}》${p.author}(${p.dynasty}) | 出处:${p.source}\n    "${p.chunkText}"`
            )
            .join("\n");
        } catch {
          console.warn("RAG Search failed, proceeding with internal knowledge.");
        }

        await sendEvent("progress", STEPS.GENERATE);
        const userMessage = buildUserMessage({
          gender,
          dayMaster,
          strength,
          favourableElements,
          avoidElements,
          surnameInstruction,
          recommendedNameLength,
        });

        const message = await getClaude().messages.create(
          {
            model: NAMING_MODEL,
            max_tokens: 4096,
            temperature: 0.7,
            // 静态指令缓存(省 ~90% 输入 token);诗词块每次不同,不缓存
            system: [
              {
                type: "text",
                text: createSystemPromptStatic(),
                cache_control: { type: "ephemeral" },
              },
              { type: "text", text: buildPoemsBlock(poemsContextText) },
            ],
            messages: [{ role: "user", content: userMessage }],
          },
          // Cancel the call if the client disconnects (same abort propagation as v2).
          { signal: request.signal }
        );

        const textBlock = message.content.find((block) => block.type === "text");
        const content = textBlock?.text;
        if (!content) {
          await failAndRefund({ error: "AI returned empty content", code: "EMPTY_RESPONSE" });
          return; // writer.close() 走 finally
        }

        try {
          parsed = JSON.parse(content);
        } catch {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            await failAndRefund({ error: "AI returned invalid JSON", code: "PARSE_ERROR" });
            return; // writer.close() 走 finally
          }
        }
      }

      // Generation is done and usable. Mark success BEFORE any archive/result write
      // so a downstream failure (dead-client write, DB hiccup) does NOT trigger a
      // refund of a result the user actually earned. See the catch below.
      generationSucceeded = true;

      // --- 完成 (把扣减后的余额一并返回,前端可即时刷新显示) ---
      // Send the result FIRST, then archive: the response is what the user paid for,
      // so it must not be blocked by (or fail because of) a slow/failed archive insert.
      if (!PIPELINE_V2) await sendEvent("progress", STEPS.DONE);
      await sendEvent("result", { data: parsed, creditsRemaining });

      // --- 存档到历史 (user_id 由 DB 默认 auth.uid() 填充;失败不影响返回) ---
      const { error: archiveError } = await supabase.from("generations").insert({
        input: {
          gender,
          dayMaster,
          strength,
          favourableElements,
          avoidElements,
          recommendedNameLength,
        },
        result: parsed,
      });
      if (archiveError) {
        console.error("Failed to archive generation:", archiveError.message);
      }
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : String(error);
      // Robust abort detection: our pipeline throws a named AbortError, but an SDK
      // abort may carry a different name — the signal being aborted is the ground truth.
      const isAbort =
        request.signal.aborted ||
        (error instanceof Error && error.name === "AbortError");

      if (generationSucceeded) {
        // The result was produced (and the credit legitimately spent); only a
        // post-success step failed — almost always the client having disconnected
        // before the result write landed. Do NOT refund: the user earned the result.
        // Log + Sentry so we still see the disconnect rate.
        console.error("Post-success stream/archive failure (no refund):", errMessage);
        Sentry.captureMessage(
          "SSE post-success failure: result produced but stream/archive write failed",
          { level: "warning", extra: { userId: user.id, error: errMessage } }
        );
      } else if (isAbort) {
        // Client disconnected mid-generation — they paid but got nothing usable, so
        // REFUND. Do NOT write to the dead stream (sendEvent would no-op anyway).
        // Nothing was archived (abort throws before the archive step).
        console.error("Generation aborted by client disconnect; refunding.");
        if (!refunded) {
          await refundCredit(user.id);
          refunded = true;
        }
      } else {
        // Genuine generation failure → refund + push an error event to the client.
        // 详细原因只记到服务端日志,绝不随 SSE 发给前端。
        console.error("Generation failed:", errMessage);
        Sentry.captureException(error); // 我们自己 catch 了,需手动上报
        await failAndRefund({ error: "Generation failed", code: "API_ERROR" });
      }
    } finally {
      // Stop the keepalive heartbeat before closing the writer.
      clearInterval(keepaliveTimer);
      // 防御:writer 已关闭(客户端断开 / 上面分支提前 return 但 finally 兜底再 close 也无害)
      // 再 close 一次会 TypeError "Invalid state",必须吞掉 —— 否则 fire-and-forget
      // IIFE 里逃出去变成 unhandledRejection。
      try {
        await writer.close();
      } catch {
        /* writer already closed — fine */
      }
    }
  })().catch((err) => {
    // Last-resort guard: nothing above should throw (sendEvent/keepalive/finally are
    // all defensive), but if anything slips through, capture it instead of letting it
    // become an unhandledRejection.
    Sentry.captureException(err);
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

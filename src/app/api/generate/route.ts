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
import { claude } from "@/lib/claude";
import { searchPoems } from "@/lib/retriever";
import { generateRequestSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { deductCredit, refundCredit } from "@/lib/credits";
import { generateRatelimit } from "@/lib/ratelimit";
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
export const dynamic = "force-dynamic";

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

  // ===== ①.5 限流(防刷/防爆发烧钱;无 Upstash 配置时自动跳过)=====
  if (generateRatelimit) {
    const { success } = await generateRatelimit.limit(user.id);
    if (!success) {
      return Response.json(
        { error: "Too many requests, please slow down.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }
  }

  // ===== ② 校验请求体 =====
  const body = await request.json();
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

  const sendEvent = async (type: string, payload: Record<string, unknown>) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`));
  };

  (async () => {
    let refunded = false;
    // 失败统一出口: 退款 + 推送 error 事件(并把退还后的余额带给前端)
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
          },
          {
            onProgress: (step, total, message) => {
              // fire-and-forget,但吞掉 rejection:客户端断开后再写会 reject,
              // 不 catch 会变成 unhandledRejection。
              sendEvent("progress", { step, total, message }).catch(() => {});
            },
          }
        );
        if (!result.names || result.names.length === 0) {
          await failAndRefund({
            error: "Couldn't compose verified names this time",
            code: "NO_VERIFIED_NAMES",
          });
          await writer.close();
          return;
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

        const message = await claude.messages.create({
          model: "claude-sonnet-4-20250514",
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
        });

        const textBlock = message.content.find((block) => block.type === "text");
        const content = textBlock?.text;
        if (!content) {
          await failAndRefund({ error: "AI returned empty content", code: "EMPTY_RESPONSE" });
          await writer.close();
          return;
        }

        try {
          parsed = JSON.parse(content);
        } catch {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            await failAndRefund({ error: "AI returned invalid JSON", code: "PARSE_ERROR" });
            await writer.close();
            return;
          }
        }
      }

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

      // --- 完成 (把扣减后的余额一并返回,前端可即时刷新显示) ---
      if (!PIPELINE_V2) await sendEvent("progress", STEPS.DONE);
      await sendEvent("result", { data: parsed, creditsRemaining });
    } catch (error: unknown) {
      // 详细原因只记到服务端日志,绝不随 SSE 发给前端
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error("Generation failed:", errMessage);
      Sentry.captureException(error); // 上报到 Sentry(我们自己 catch 了,需手动上报)
      await failAndRefund({ error: "Generation failed", code: "API_ERROR" });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

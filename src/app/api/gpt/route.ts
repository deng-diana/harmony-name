/**
 * /api/gpt — 非流式版本 (备用/遗留入口,前端当前不用)
 *
 * ⚠️ 即便前端不调它,接口暴露在公网就可能被直接打 → 烧钱。
 * 所以这里同样接入鉴权 + 扣分 + 失败退款,和 /api/generate 一致。
 * (Phase 5 清理时可考虑直接删除本路由以减少维护面。)
 */
import { NextResponse } from "next/server";
import { claude } from "@/lib/claude";
import { calculateBazi } from "@/lib/bazi";
import { searchPoems } from "@/lib/retriever";
import { gptRequestSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { deductCredit, refundCredit } from "@/lib/credits";
import {
  createSystemPrompt,
  buildUserMessage,
  buildSurnameInstruction,
} from "@/lib/prompt";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.CLAUDE_API_KEY) {
    return NextResponse.json(
      { error: "Server configuration error", code: "ENV_MISSING" },
      { status: 500 }
    );
  }

  // ① 鉴权
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  // ② 校验请求体
  const body = await request.json();
  const parseResult = gptRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid request", code: "VALIDATION_ERROR", details: parseResult.error.issues },
      { status: 400 }
    );
  }
  const { birthDate, birthTime, gender, surnamePreference, specifiedSurname, longitude, timezone } =
    parseResult.data;

  // ③ 扣分 (先扣后用)
  const deduction = await deductCredit(supabase);
  if (!deduction.ok) {
    if (deduction.code === "INSUFFICIENT_CREDITS") {
      return NextResponse.json(
        { error: "You're out of credits", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { error: "Failed to process request", code: "CREDIT_ERROR" },
      { status: 500 }
    );
  }

  // ④ 生成 (失败则退款)
  try {
    const city =
      longitude !== undefined && timezone
        ? { longitude: Number(longitude), timezone: String(timezone) }
        : undefined;
    const baziResult = calculateBazi(birthDate, birthTime, city);
    const {
      dayMaster,
      strength,
      favourableElements,
      avoidElements,
      recommendedNameLength,
      bazi,
      wuxing,
    } = baziResult;

    const ELEMENT_IMAGERY: Record<string, string> = {
      Wood: "春天 生长 树木 青翠 仁德 东风",
      Fire: "光明 热情 朝阳 辉煌 礼仪 南方",
      Earth: "大地 厚德 稳重 丰收 信义 中央",
      Metal: "秋天 坚毅 清白 明月 义气 西方",
      Water: "流水 智慧 深远 润泽 冬天 北方",
    };
    let poemsContextText = "";
    try {
      const imageryWords = favourableElements.map((el: string) => ELEMENT_IMAGERY[el] || el).join(" ");
      const retrievedPoems = await searchPoems(`中国古典诗词 ${imageryWords}`, 10);
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

    const surnameInstruction = buildSurnameInstruction(surnamePreference, specifiedSurname, dayMaster);
    const userMessage = buildUserMessage({
      gender,
      dayMaster,
      strength,
      favourableElements,
      avoidElements,
      surnameInstruction,
      recommendedNameLength,
      birthInfo: `${birthDate} ${birthTime}`,
    });

    const message = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      temperature: 0.7,
      system: createSystemPrompt(poemsContextText),
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    const content = textBlock?.text;
    if (!content) {
      await refundCredit(user.id);
      return NextResponse.json(
        { error: "AI returned empty content", code: "EMPTY_RESPONSE" },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        await refundCredit(user.id);
        return NextResponse.json(
          { error: "AI returned invalid JSON", code: "PARSE_ERROR" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ...parsed,
      creditsRemaining: deduction.remaining,
      baziContext: { dayMaster, strength, favourableElements, avoidElements, recommendedNameLength, bazi, wuxing },
    });
  } catch (error: unknown) {
    await refundCredit(user.id);
    console.error("Claude API Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to process request", code: "API_ERROR", details: message },
      { status: 500 }
    );
  }
}

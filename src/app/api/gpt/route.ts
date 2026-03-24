import { NextResponse } from "next/server";
import { claude } from "@/lib/claude";
import { calculateBazi } from "@/lib/bazi";
import { searchPoems } from "@/lib/retriever";
import { gptRequestSchema } from "@/lib/schemas";
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

  try {
    const body = await request.json();
    const parseResult = gptRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", code: "VALIDATION_ERROR", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const {
      birthDate,
      birthTime,
      gender,
      surnamePreference,
      specifiedSurname,
      longitude,
      timezone,
    } = parseResult.data;

    // BaZi calculation (with True Solar Time if location provided)
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

    // RAG retrieval — 用中文五行意象词搜索
    const ELEMENT_IMAGERY: Record<string, string> = {
      Wood: "春天 生长 树木 青翠 仁德 东风",
      Fire: "光明 热情 朝阳 辉煌 礼仪 南方",
      Earth: "大地 厚德 稳重 丰收 信义 中央",
      Metal: "秋天 坚毅 清白 明月 义气 西方",
      Water: "流水 智慧 深远 润泽 冬天 北方",
    };
    let poemsContextText = "";
    try {
      const imageryWords = favourableElements
        .map((el: string) => ELEMENT_IMAGERY[el] || el)
        .join(" ");
      const query = `中国古典诗词 ${imageryWords}`;
      const retrievedPoems = await searchPoems(query, 10);
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

    const surnameInstruction = buildSurnameInstruction(
      surnamePreference,
      specifiedSurname,
      dayMaster
    );

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

    // ===== Claude API 调用 =====
    // 和 OpenAI 的主要区别:
    //   OpenAI:  messages: [{role:"system",...}, {role:"user",...}]
    //   Claude:  system: "...",  messages: [{role:"user",...}]
    //   Claude 的 system prompt 是独立参数，不放在 messages 里
    const message = await claude.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      temperature: 0.7,
      system: createSystemPrompt(poemsContextText),
      messages: [
        { role: "user", content: userMessage },
      ],
    });

    // Claude 返回的格式也不同:
    //   OpenAI: completion.choices[0].message.content (string)
    //   Claude: message.content[0].text (content 是数组，每项有 type 和 text)
    const textBlock = message.content.find((block) => block.type === "text");
    const content = textBlock?.text;

    if (!content) {
      return NextResponse.json(
        { error: "AI returned empty content", code: "EMPTY_RESPONSE" },
        { status: 500 }
      );
    }

    // Claude 可能会在 JSON 前后加说明文字，需要提取纯 JSON
    let parsed;
    try {
      // 尝试直接 parse
      parsed = JSON.parse(content);
    } catch {
      // 如果失败，尝试从文本中提取 JSON 块
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: "AI returned invalid JSON", code: "PARSE_ERROR" },
          { status: 500 }
        );
      }
    }

    // Validate name count
    const nameCount = Array.isArray(parsed.names) ? parsed.names.length : 0;
    if (nameCount !== 3) {
      console.warn(`Expected 3 names, got ${nameCount}`);
    }

    return NextResponse.json({
      ...parsed,
      baziContext: {
        dayMaster,
        strength,
        favourableElements,
        avoidElements,
        recommendedNameLength,
        bazi,
        wuxing,
      },
    });
  } catch (error: unknown) {
    console.error("Claude API Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to process request", code: "API_ERROR", details: message },
      { status: 500 }
    );
  }
}

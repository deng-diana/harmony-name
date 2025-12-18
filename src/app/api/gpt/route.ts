import { NextResponse } from "next/server";
import OpenAI from "openai";
import { calculateBazi } from "@/lib/bazi"; // 1. 引入算命逻辑
import { searchPoems } from "@/lib/retriever"; // 2. 引入 RAG 逻辑

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// --- 1. 初始化 OpenAI ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- 2. 系统提示词 (保持高质量标准，与 /api/generate 一致) ---
const createSystemPrompt = (contextPoems: string) => `
Role: You are a world-class Chinese Cultural Consultant and Naming Master. 
Mission: Create 3 culturally profound Chinese names based on BaZi (Destiny Chart).

--- CONTEXT (RETRIEVED POEMS) ---
${contextPoems}

--- RULES ---
1. **Source Priority**: 
   - PRIORITY 1: Use characters from the "CONTEXT" poems above.
   - PRIORITY 2: If context doesn't fit, use other **authentic Chinese Classics** (Tang/Song Poetry, Shijing, Chu Ci, Idioms).

2. **LITERAL MATCH CHECK (CRITICAL)**: 
   - The "original" text MUST contain the characters used in the name.
   - **Strategy**: Find the poem FIRST, then pick the name characters FROM the poem.
   - Wrap the name characters in curly braces {} in the "original" field.

3. **Modern Aesthetics**:
   - Avoid obscure/archaic characters.
   - Prefer elegant characters (e.g., "Yun", "Ting", "Ze", "Mu").

4. **Cultural Source**:
   - Quote ONLY the specific couplet (2 lines max).

--- JSON OUTPUT FORMAT ---
{
  "analysis": "Brief summary of the user's BaZi (e.g. Weak Wood, needs Water).",
  "names": [
    {
      "hanzi": "Surname + Name",
      "pinyin": "...",
      "poeticMeaning": "...",
      "culturalHeritage": {
        "source": "Tang Poem 《...》 by ...",
        "original": "Line 1..., Line 2...",
        "translation": "..."
      },
      "anatomy": [
        { "char": "...", "meaning": "...", "type": "Surname", "element": "..." },
        { "char": "...", "meaning": "...", "type": "Given Name", "element": "..." }
      ],
      "masterComment": "..."
    }
  ]
}
`;

export async function POST(request: Request) {
  // --- 启动检查 ---
  console.log("🚀 GPT API Route Started: /api/gpt (All-in-One Endpoint)");

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY is missing");
    return NextResponse.json(
      {
        error: "Server configuration error",
        details: "OpenAI API Key missing",
      },
      { status: 500 }
    );
  }

  try {
    // --- 1. 接收 ChatGPT 发来的原始数据 (包含生日、时间、地理位置等) ---
    const body = await request.json();
    const {
      birthDate,
      birthTime = "unknown",
      gender = "male",
      surnamePreference = "auto",
      specifiedSurname = "",
      // 🆕 新增：支持经纬度和时区，用于真太阳时计算
      longitude,
      timezone,
    } = body;

    console.log("🤖 GPT Request:", {
      birthDate,
      birthTime,
      gender,
      longitude: longitude ? `${longitude}°` : "not provided",
      timezone: timezone || "not provided",
    });

    // --- 2. [服务器端] 执行八字计算 (支持真太阳时) ---
    // 构造 city 对象：如果提供了经纬度和时区，则用于真太阳时计算
    const city =
      longitude !== undefined && timezone
        ? { longitude: Number(longitude), timezone: String(timezone) }
        : undefined;

    const baziResult = calculateBazi(birthDate, birthTime, city);

    // 提取关键指标（包含所有必要信息）
    const {
      dayMaster,
      strength,
      favourableElements,
      avoidElements,
      recommendedNameLength,
      bazi,
      wuxing,
    } = baziResult;

    console.log(
      `📊 BaZi Calculated: ${dayMaster} (${strength}), Favourable: ${favourableElements.join(
        ", "
      )}`
    );

    // --- 3. [服务器端] 执行 RAG 检索 ---
    console.log(`🔍 RAG Searching for: ${favourableElements.join(" ")}`);
    const query = `Chinese classical poetry and idioms related to ${favourableElements.join(
      " "
    )} elements`;

    let poemsContextText = "";
    try {
      const retrievedPoems = await searchPoems(query, 5);
      poemsContextText = retrievedPoems
        .map(
          (p, i) =>
            `[${i + 1}] Title:《${p.title}》 Author:${p.author} Content:${
              p.content
            }`
        )
        .join("\n");
      console.log("📚 RAG Context Loaded");
    } catch {
      console.warn("⚠️ RAG Search failed, proceeding with internal knowledge.");
    }

    // --- 4. 构建用户指令 (参考 /api/generate 的完整逻辑) ---
    let surnameInstruction = "";
    if (
      surnamePreference === "specified" ||
      surnamePreference === "from_common"
    ) {
      surnameInstruction = `MANDATORY SURNAME: "${specifiedSurname}".`;
    } else {
      surnameInstruction = `RECOMMEND a surname that balances the Day Master (${dayMaster}).`;
    }

    const userMessage = `
      User Profile:
      - Gender: ${gender}
      - Birth: ${birthDate} ${birthTime}
      - Day Master: ${dayMaster} (${strength})
      - Favourable Elements: ${favourableElements.join(", ")}
      - Avoid Elements: ${avoidElements.join(", ")}
      - Recommended Name Length: ${recommendedNameLength}
      
      ${surnameInstruction}
      
      **NAMING TASK**:
      1. Target Length: ${recommendedNameLength}
      2. **Step-by-Step**:
         - Step A: Find a poem from Context or Memory that matches the Favourable Elements.
         - Step B: EXTRACT 1 or 2 characters DIRECTLY from that poem.
         - Step C: Combine with Surname.
      3. **VERIFY**: Do the characters actually exist in the poem?
      4. Generate 3 names using the RAG Context.
    `;

    // --- 5. 调用 OpenAI (gpt-4o-mini) ---
    console.log("🤖 Calling OpenAI API...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: createSystemPrompt(poemsContextText) },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7, // 保持适度的创造力
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("OpenAI returned empty content");
    }

    // --- 6. 返回结果给 ChatGPT ---
    console.log("✅ OpenAI Response Received");
    const parsedContent = JSON.parse(content);

    // 可选：在返回结果中包含八字信息，方便 ChatGPT 做进一步分析
    return NextResponse.json({
      ...parsedContent,
      // 附加八字信息（可选，方便 ChatGPT 理解上下文）
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
  } catch (error) {
    console.error("❌ GPT API Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

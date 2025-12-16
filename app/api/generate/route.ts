import { NextResponse } from "next/server";
import OpenAI from "openai";
// 🎯 关键路径修正：
// 因为 retriever.ts 在 src/lib 下，而 @ 代表 src
// 所以这里必须是 @/lib/retriever
import { searchPoems } from "@/src/lib/retriever";

// 设置最大运行时间
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// --- 1. DeepSeek 初始化配置 ---
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
// 自动处理 Base URL 格式 (确保以 /v1 结尾)
const RAW_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const normalizedBaseURL = RAW_BASE_URL.endsWith("/v1") 
  ? RAW_BASE_URL 
  : RAW_BASE_URL.endsWith("/") 
    ? `${RAW_BASE_URL}v1` 
    : `${RAW_BASE_URL}/v1`;

const openai = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: normalizedBaseURL,
});

// --- 2. 系统提示词 (保持高标准) ---
const createSystemPrompt = (contextPoems: string) => `
Role: You are a world-class Chinese Cultural Consultant.
Mission: Create 3 culturally profound Chinese names based on BaZi.

--- CONTEXT (RETRIEVED POEMS) ---
${contextPoems}

--- RULES ---
1. **Source Priority**: 
   - PRIORITY 1: Use characters from the "CONTEXT" poems above.
   - PRIORITY 2: If context doesn't fit, use other **authentic Chinese Classics** (Tang/Song Poetry, Shijing, Chu Ci, Idioms).

2. **LITERAL MATCH CHECK (CRITICAL)**: 
   - The "original" text MUST contain the characters used in the name.
   - **IF NAME IS "清心"**: The poem MUST contain "清" AND "心".
   - **Strategy**: Find the poem FIRST, then pick the name characters FROM the poem.

3. **Modern Aesthetics**:
   - Avoid obscure/archaic characters.
   - Prefer elegant characters (e.g., "Yun", "Ting", "Ze", "Mu").

4. **Cultural Source**:
   - Quote ONLY the specific couplet (2 lines max).
   - **HIGHLIGHTING**: Wrap the name characters in curly braces {}.

--- JSON OUTPUT FORMAT ---
{
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
  // --- 3. 启动检查 ---
  console.log("🚀 API Route Started: /api/generate");
  
  if (!DEEPSEEK_API_KEY) {
    console.error("❌ DEEPSEEK_API_KEY is missing");
    return NextResponse.json(
      { error: "Server configuration error", details: "DeepSeek API Key missing" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const {
      gender,
      dayMaster,
      strength,
      favourableElements,
      surnamePreference,
      specifiedSurname,
      recommendedNameLength,
    } = body;

    // 4. 执行 RAG 检索
    console.log(`🔍 Searching poems for: ${favourableElements.join(" ")}`);
    const query = `Chinese classical poetry and idioms related to ${favourableElements.join(" ")} elements`;

    let poemsContextText = "";
    try {
      const retrievedPoems = await searchPoems(query, 5);
      poemsContextText = retrievedPoems
        .map((p, i) => `[${i + 1}] Title:《${p.title}》 Author:${p.author} Content:${p.content}`)
        .join("\n");
      console.log("📚 RAG Context Loaded");
    } catch (ragError) {
      console.warn("⚠️ RAG Search failed, proceeding with internal knowledge.");
    }

    // 5. 构建用户指令
    let surnameInstruction = "";
    if (surnamePreference === "specified" || surnamePreference === "from_common") {
      surnameInstruction = `MANDATORY SURNAME: "${specifiedSurname}".`;
    } else {
      surnameInstruction = `RECOMMEND a surname that balances the Day Master (${dayMaster}).`;
    }

    const userMessage = `
      User Profile:
      - Gender: ${gender}
      - Day Master: ${dayMaster} (${strength})
      - Favourable: ${favourableElements.join(", ")}
      
      ${surnameInstruction}
      
      **NAMING TASK**:
      1. Target Length: ${recommendedNameLength}
      2. **Step-by-Step**:
         - Step A: Find a poem from Context or Memory that matches the Favourable Elements.
         - Step B: EXTRACT 1 or 2 characters DIRECTLY from that poem.
         - Step C: Combine with Surname.
      3. **VERIFY**: Do the characters actually exist in the poem? If no, go back to Step A.
    `;

    // 6. 调用 DeepSeek
    console.log("🤖 Calling DeepSeek API...");
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat", 
      messages: [
        { role: "system", content: createSystemPrompt(poemsContextText) },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.75,
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("DeepSeek returned empty content");
    }

    // 7. 返回结果
    console.log("✅ DeepSeek Response Received");
    return NextResponse.json(JSON.parse(content));

  } catch (error: any) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate names", details: error.message }, 
      { status: 500 }
    );
  }
}
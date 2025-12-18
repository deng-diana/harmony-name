import { NextResponse } from "next/server";
import OpenAI from "openai";
// 引入检索器
import { searchPoems } from "@/lib/retriever";

// 设置最大运行时间 (虽然 gpt-4o-mini 很快，但保留 60s 以防万一)
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// --- 1. 初始化 OpenAI (回归经典) ---
// 只要你的 .env.local 里有 OPENAI_API_KEY，它会自动读取
// 不需要再配置 baseURL 了，因为它默认就是去 OpenAI 官网
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- 2. 系统提示词 (保持之前的高标准) ---
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
  console.log("🚀 API Route Started: /api/generate (Model: gpt-4o-mini)");
  
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY is missing");
    return NextResponse.json(
      { error: "Server configuration error", details: "OpenAI API Key missing" },
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
      3. **VERIFY**: Do the characters actually exist in the poem?
    `;

    // 6. 调用 OpenAI (gpt-4o-mini)
    console.log("🤖 Calling OpenAI API...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // 👈 切换回了速度之王
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

    // 7. 返回结果
    console.log("✅ OpenAI Response Received");
    return NextResponse.json(JSON.parse(content));

  } catch (error: any) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate names", details: error.message }, 
      { status: 500 }
    );
  }
}

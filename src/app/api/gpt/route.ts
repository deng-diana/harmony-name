import { NextResponse } from "next/server";
import OpenAI from "openai";
import { calculateBazi } from "@/lib/bazi";      // 1. 引入算命逻辑
import { searchPoems } from "@/lib/retriever"; // 2. 引入 RAG 逻辑

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 复用你的高质量 Prompt
const createSystemPrompt = (contextPoems: string) => `
Role: You are a world-class Chinese Cultural Consultant.
Mission: Create 3 culturally profound Chinese names based on BaZi.

--- CONTEXT (RETRIEVED POEMS) ---
${contextPoems}

--- RULES ---
1. **Source Priority**: 
   - PRIORITY 1: Use characters from the "CONTEXT" poems above.
   - PRIORITY 2: If context doesn't fit, use other **authentic Chinese Classics**.

2. **LITERAL MATCH CHECK (CRITICAL)**: 
   - The "original" text MUST contain the characters used in the name.
   - Wrap the name characters in curly braces {}.

3. **JSON OUTPUT FORMAT**:
   {
     "analysis": "Brief summary of the user's BaZi (e.g. Weak Wood, needs Water).",
     "names": [
       {
         "hanzi": "Surname + Name",
         "pinyin": "...",
         "poeticMeaning": "...",
         "culturalHeritage": {
           "source": "...",
           "original": "...",
           "translation": "..."
         },
         "anatomy": [
           { "char": "...", "meaning": "...", "type": "Surname", "element": "..." },
           { "char": "...", "meaning": "...", "type": "Given Name", "element": "..." }
         ]
       }
     ]
   }
`;

export async function POST(request: Request) {
  try {
    // 1. 接收 ChatGPT 发来的原始数据 (只包含生日等基础信息)
    const body = await request.json();
    const { 
      birthDate, 
      birthTime = "unknown", 
      gender = "male",
      surnamePreference = "auto", 
      specifiedSurname = "" 
    } = body;

    console.log("🤖 GPT Request:", { birthDate, birthTime, gender });

    // 2. [服务器端] 执行八字计算 (替代了前端的工作)
    const baziResult = calculateBazi(birthDate, birthTime);
    
    // 提取关键指标
    const { dayMaster, strength, favourableElements, avoidElements } = baziResult;

    // 3. [服务器端] 执行 RAG 检索
    console.log(`🔍 RAG Searching for: ${favourableElements.join(' ')}`);
    const query = `Chinese classical poetry and idioms related to ${favourableElements.join(' ')} elements`;
    
    let poemsContextText = "";
    try {
      const retrievedPoems = await searchPoems(query, 5);
      poemsContextText = retrievedPoems.map((p, i) => 
        `[${i+1}] Title:《${p.title}》 Author:${p.author} Content:${p.content}`
      ).join("\n");
    } catch (e) {
      console.warn("RAG failed, using fallback.");
    }

    // 4. 构建 Prompt
    let surnameInstruction = "";
    if (surnamePreference === 'specified' && specifiedSurname) {
      surnameInstruction = `MANDATORY SURNAME: "${specifiedSurname}".`;
    } else {
      surnameInstruction = `RECOMMEND a surname that balances the Day Master (${dayMaster}).`;
    }

    const userMessage = `
      User Profile:
      - Gender: ${gender}
      - Birth: ${birthDate} ${birthTime}
      - Day Master: ${dayMaster} (${strength})
      - Favourable: ${favourableElements.join(', ')}
      
      ${surnameInstruction}
      
      Task: Generate 3 names using the RAG Context.
    `;

    // 5. 调用 AI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: createSystemPrompt(poemsContextText) },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content");

    // 6. 直接返回 JSON 给 ChatGPT
    return NextResponse.json(JSON.parse(content));

  } catch (error: any) {
    console.error("❌ GPT API Error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { searchPoems } from "../../../lib/retriever";

// ⚠️ 这里的 maxDuration 是为了防止 Vercel/AWS Lambda 超时
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const createSystemPrompt = (contextPoems: string) => `
Role: You are a world-class Chinese Cultural Consultant.
Mission: Create 3 culturally profound Chinese names based on BaZi.

--- CONTEXT (RETRIEVED POEMS) ---
The following poems match the user's elements:
${contextPoems}

--- RULES ---
1. **Source Priority**: 
   - PRIORITY 1: Check the "CONTEXT" poems above first.
   - PRIORITY 2: If the context poems do not fit the Surname/Elements well, you may cite other **authentic Chinese Classics** from your internal knowledge.
   - **Acceptable Sources**: Tang/Song Poetry, Shijing (Book of Songs), Chu Ci, Idioms (Chengyu), I Ching, or Taoist/Confucian classics (Lunyu, Daodejing).

2. **Strict Authenticity (Anti-Hallucination)**: 
   - Whether using Context or Internal knowledge, the source MUST be real. 
   - The "original" text MUST contain the EXACT characters used in the name.
   - Wrap the name characters in curly braces {} in the "original" field.
   - Example: "For name '子衿', source 'Shijing': 青青{子}{衿}，悠悠我心。"

3. **Output**: Return valid JSON.
`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      gender,
      dayMaster,
      strength,
      favourableElements,
      avoidElements,
      surnamePreference,
      specifiedSurname,
    } = body;

    // 1. 检索
    console.log(`🔍 Searching poems for: ${favourableElements.join(" ")}`);
    // 搜索词加入 "classic", "idiom" 增加广度
    const query = `Chinese classical poetry and idioms related to ${favourableElements.join(
      " "
    )} elements`;

    let poemsContextText = "";
    try {
      const retrievedPoems = await searchPoems(query, 3);
      poemsContextText = retrievedPoems
        .map(
          (p, i) =>
            `[${i + 1}] Title:《${p.title}》 Author:${p.author} Content:${
              p.content
            }`
        )
        .join("\n");
      console.log("📚 RAG Context:\n", poemsContextText);
    } catch (e) {
      console.warn("RAG Search failed, falling back to internal knowledge.");
    }

    // 2. 构建指令
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
      - Day Master: ${dayMaster} (${strength})
      - Favourable: ${favourableElements.join(", ")}
      
      ${surnameInstruction}
      
      Task: Generate 3 names. 
      Try to use the RAG Context. If not suitable, use Shijing, Chu Ci, or Idioms to ensure variety and fit.
    `;

    // 3. 调用 AI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: createSystemPrompt(poemsContextText) },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.75, // 稍微提高一点点，因为来源变广了，需要一点灵活性
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content");

    console.log("🤖 AI Response Preview:", content.substring(0, 50) + "...");

    return NextResponse.json(JSON.parse(content));
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}

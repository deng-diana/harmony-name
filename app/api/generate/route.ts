import { NextResponse } from "next/server";
import OpenAI from "openai";
import { searchPoems } from "@/src/lib/retriever";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
   - **WRONG**: Citing a poem about "sadness" that doesn't have the word "清心".
   - **RIGHT**: "明月松间照，{清}泉石上流... (Heart/Mind implied or explicitly present)".
   - **Better Strategy**: Find the poem FIRST, then pick the name characters FROM the poem.

3. **JSON SCHEMA**:
   {
     "names": [
       {
         "hanzi": "Surname + Name",
         "pinyin": "...",
         "poeticMeaning": "...",
         "culturalHeritage": {
           "source": "Tang Poem 《...》 by ...",
           "original": "Full poetic sentence here with {highlight}...", 
           "translation": "..."
         },
         "anatomy": [
           { "char": "...", "meaning": "...", "type": "Surname", "element": "..." },
           { "char": "...", "meaning": "...", "type": "Given Name", "element": "..." }
         ],
         "masterComment": "Analysis..."
       }
     ]
   }
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
      recommendedNameLength,
    } = body;

    // 1. 检索
    console.log(`🔍 Searching poems for: ${favourableElements.join(" ")}`);
    const query = `Chinese classical poetry and idioms related to ${favourableElements.join(
      " "
    )} elements`;

    let poemsContextText = "";
    try {
      const retrievedPoems = await searchPoems(query, 5); // 找5首
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
      console.warn("RAG Search failed, falling back.");
    }

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
      
      **NAMING TASK**:
      1. Target Length: ${recommendedNameLength}
      2. **Step-by-Step**:
         - Step A: Find a poem from Context or Memory that matches the Favourable Elements.
         - Step B: EXTRACT 1 or 2 characters DIRECTLY from that poem to form the Given Name.
         - Step C: Combine with Surname.
      3. **VERIFY**: Do the characters actually exist in the poem? If no, go back to Step A.
    `;

    // 3. 调用 AI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: createSystemPrompt(poemsContextText) },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6, // 再次降温，让它更守规矩
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content");

    return NextResponse.json(JSON.parse(content));
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}

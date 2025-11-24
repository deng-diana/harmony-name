import { NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `
Role: You are a rigorous Chinese Cultural Scholar.
Mission: Recommend 3 authentic Chinese names based on BaZi.

--- CRITICAL RULES (STRICT MODE) ---
1. **NO FAKE POEMS**: The "culturalHeritage" MUST be a real, verifiable classical text.
2. **CHARACTER MATCH**: The "original" text MUST contain the EXACT characters used in the name.
   - If name is "邓几青" (Deng Ji Qing), the poem MUST contain "几" AND "青".
   - If you cannot find a poem with BOTH characters, DO NOT use that name. Pick a simpler name with a solid source.
3. **HIGHLIGHTING**: Wrap ONLY the name characters in curly braces {}.
   - Correct: "明月{几}时有？把酒问{青}天。"
   - Wrong: "{明月}几时有" (Do not highlight extra words).
4. **NAME LENGTH**: 
   - You can generate 2-character names (Surname + 1 char) OR 3-character names (Surname + 2 chars).
   - Mix them up based on what sounds best.

--- OUTPUT JSON FORMAT ---
{
  "balanceAdvice": "Your Earth energy flows best when...",
  "names": [
    {
      "hanzi": "Surname + Name",
      "pinyin": "Lǐ Yǎ Tíng",
      "poeticMeaning": "A graceful willow swaying softly in the spring breeze", 
      "culturalHeritage": {
        "source": "Song Ci 《Butterfly Loves Flower》 by Ouyang Xiu",
        "original": "庭院深{深}深几许，{杨}柳堆烟", 
        "translation": "Deep, deep is the courtyard, where willows stack like mist..."
      },
      "anatomy": [
        { "char": "李", "pinyin": "Lǐ", "meaning": "Plum Tree", "type": "Surname", "element": "Wood" },
        { "char": "雅", "pinyin": "Yǎ", "meaning": "Elegant", "type": "Given Name", "element": "Wood" }
      ],
      "masterComment": "Since your Day Master is Weak Wood..."
    }
  ]
}
`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API Key missing" }, { status: 500 });

    const openai = new OpenAI({ apiKey });
    const body = await request.json();
    
    const { 
      wuxing, gender, surnamePreference, specifiedSurname, 
      dayMaster, bazi, strength, favourableElements, avoidElements 
    } = body;

    let surnameInstruction = "";
    if (surnamePreference === 'specified' || surnamePreference === 'from_common') {
      surnameInstruction = `MANDATORY SURNAME: "${specifiedSurname}". Use this surname.`;
    } else {
      surnameInstruction = `RECOMMEND a surname that balances the Day Master (${dayMaster}).`;
    }

    const userMessage = `
      User Profile:
      - Gender: ${gender}
      - Day Master (Core Self): ${dayMaster}
      - Strength: ${strength}
      - Yong Shen (Favourable): ${favourableElements.join(', ')}
      - Avoid: ${avoidElements.join(', ')}
      
      ${surnameInstruction}
      
      Task:
      1. Generate 3 names (can be 2-char or 3-char).
      2. STRICTLY verify that the poem citation contains the name characters.
      3. If no poem fits a name, DISCARD the name and try another.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4, // 🔥 大幅降温：从 0.85 -> 0.4，让它变老实
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content");

    return NextResponse.json(JSON.parse(content));

  } catch (error: any) {
    console.error("❌ AI Error:", error);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}
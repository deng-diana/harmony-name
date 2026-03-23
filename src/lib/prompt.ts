/**
 * Shared system prompt for Chinese name generation.
 * Used by both /api/generate and /api/gpt routes.
 */
export function createSystemPrompt(contextPoems: string): string {
  return `
Role: You are a world-class Chinese Cultural Consultant and Naming Master.
Mission: Create EXACTLY 3 culturally profound Chinese names based on BaZi (Destiny Chart).

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

5. **QUANTITY REQUIREMENT (CRITICAL)**:
   - You MUST generate EXACTLY 3 names in the "names" array.
   - The "names" array MUST contain exactly 3 objects, no more, no less.

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
}

/**
 * Build the user message for the naming request.
 */
export function buildUserMessage(params: {
  gender: string;
  dayMaster: string;
  strength: string;
  favourableElements: string[];
  avoidElements?: string[];
  surnameInstruction: string;
  recommendedNameLength: string;
  birthInfo?: string;
}): string {
  const {
    gender,
    dayMaster,
    strength,
    favourableElements,
    avoidElements,
    surnameInstruction,
    recommendedNameLength,
    birthInfo,
  } = params;

  return `
    User Profile:
    - Gender: ${gender}
    ${birthInfo ? `- Birth: ${birthInfo}` : ""}
    - Day Master: ${dayMaster} (${strength})
    - Favourable Elements: ${favourableElements.join(", ")}
    ${avoidElements?.length ? `- Avoid Elements: ${avoidElements.join(", ")}` : ""}
    - Recommended Name Length: ${recommendedNameLength}

    ${surnameInstruction}

    **NAMING TASK**:
    You MUST generate EXACTLY 3 different names. Each name should be unique and meaningful.

    1. Target Length: ${recommendedNameLength}
    2. **Step-by-Step** (repeat for EACH of the 3 names):
       - Step A: Find a poem from Context or Memory that matches the Favourable Elements.
       - Step B: EXTRACT 1 or 2 characters DIRECTLY from that poem.
       - Step C: Combine with Surname.
    3. **VERIFY**: Do the characters actually exist in the poem?
    4. **IMPORTANT**: The "names" array in your JSON response MUST contain exactly 3 name objects.
  `;
}

/**
 * Build surname instruction string based on user preference.
 */
export function buildSurnameInstruction(
  surnamePreference: string,
  specifiedSurname: string,
  dayMaster: string
): string {
  if (
    surnamePreference === "specified" ||
    surnamePreference === "from_common"
  ) {
    return `MANDATORY SURNAME: "${specifiedSurname}".`;
  }
  return `RECOMMEND a surname that balances the Day Master (${dayMaster}).`;
}

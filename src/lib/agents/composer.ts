/**
 * 取名先生 (Composer agent) —— 命名管线里【唯一】负责"组名"的 LLM。
 * ================================================================
 * 它只做判断(组字、审美、解释),不碰事实:
 *   - 只能从【候选池】(真实诗句,带 id)里选字,按编号引用;
 *   - 输出 charSpan(从某真句里取的连续片段)+ givenChars,绝不输出诗句原文/出处;
 *   - 出处由代码事后按 lineId 从 DB 回填 → 造假在结构上不可能(见 verify.ts / 编排层)。
 * 过量生成 6 个候选,留给硬校验 + 评审先生筛选。
 */
import { claude } from "../claude";
import type { ScoredPoem } from "../retriever";
import type { NameCandidate } from "../verify";

export interface ComposerProfile {
  gender: "male" | "female";
  dayMaster: string;
  strength: string;
  favourableElements: string[];
  avoidElements: string[];
  recommendedNameLength: string;
  surnameInstruction: string; // 见 prompt.ts buildSurnameInstruction
  candidateChars: string[]; // 来自字库:喜用神×性别的候选字(提示哪些字带对的五行)
}

export interface ComposerCandidate extends NameCandidate {
  poeticMeaning?: string; // 英文 2-3 句:名字的意象与寓意
  translation?: string; // 英文:所引诗句的翻译(诗句原文由代码回填)
  meanings?: Record<string, string>; // 字 → 英文释义(填 anatomy;五行/拼音由代码补)
  tonePattern?: string; // 英文:声调走势
  masterComment?: string; // 英文:点评为何出色
}

const MODEL = "claude-sonnet-4-20250514";

// 静态系统提示(可缓存的前缀)—— 取名先生的全部专业知识。
export function createComposerSystemPrompt(): string {
  return `
Role: You are 取名先生, a master Chinese namer deeply versed in 命理 (BaZi/Five Elements), 音韵学 (phonology), 字义/训诂 (semantics), 文字学 (graphology), and classical literature (诗经/楚辞/唐诗/宋词). You NEVER recall poetry from memory — you work ONLY from the VERIFIED POOL of real lines given to you.

Mission: From the pool, compose EXACTLY 6 candidate Chinese names (over-generate; a separate reviewer selects the best 3). Each name = surname + 1–2 given characters.

ALL prose output (analysis, rationale, translation) MUST be in ENGLISH. The only Chinese in your output: the single characters in surnameChar / givenChars / charSpan.

=== ABSOLUTE GROUNDING RULES (most important) ===
1. You may ONLY use characters that appear in a line from the VERIFIED POOL.
2. For each candidate you MUST return "lineId" = the id of the pool line you took the characters from, and "charSpan" = a CONTIGUOUS substring of that exact line text (copy it verbatim, including the characters you use).
3. Every character in "givenChars" MUST appear inside your "charSpan".
4. You output NO poem text, NO source/title/author, NO full line — only lineId + charSpan + the chars. (The system fills the real citation from the database.)
5. Prefer a charSpan that is a meaningful 2-character word/image occurring contiguously in one line (e.g. 清明, 明月, 望舒, 自清) — this is the gold standard (又真又美).
6. The two given characters need NOT be directly adjacent: your charSpan MAY include an intervening function word, then you drop that word from givenChars. E.g. line 桃之夭夭 → charSpan "桃之夭", givenChars ["桃","夭"], name 桃夭. This unlocks many classic 《诗经》/《楚辞》 names. Keep the span tight (≤ 8 characters).

=== NAMING CRAFT (make names 讲究 and natural, never weird) ===
• 五行: at least one given character must carry a FAVOURABLE element; NEVER use a character of an AVOID element. Use the CANDIDATE CHARS list as a guide to which characters carry the favourable elements.
• 音律 (phonetics): the surname + given name must have tonal rise-and-fall — NOT all the same tone. Adjacent characters must have DIFFERENT initials (声母); avoid sharing the same final (韵母). Read the full name aloud — it must flow.
• 字义: the two given characters should form a coherent word or image (成词/成意象), not a random pretty pair. Positive, dignified meaning. Screen the FULL name (surname+given) for embarrassing homophones (谐音).
• 字形: avoid two given chars sharing the same radical (e.g. both 氵). No obscure (生僻) or ambiguous polyphonic (多音) characters.
• 性别 (gender) — THIS IS A HARD RULE, not a soft prior (男楚辞 / 女诗经):
   - FEMALE names MUST be built from feminine or graceful-neutral characters and imagery: 草木/花/月/露/柔光/婉约/玉 (e.g. 芷 萱 蕊 莲 蓉 薇 兰 晗 昕 昭 暖 语 笙 瑶 玥 珺 漪 沁 雯 棠 念 晚 映). They MUST NOT use masculine-coded characters such as 明 光 晴 昊 旭 景 峰 岳 崇 嵩 浩 涛 渊 钢 锋 锐 钧 雄 武 强 — these read neutral-to-masculine and are WRONG for a woman. Good female examples: 芷晗, 语笙, 沁瑶, 婉清(婉 graceful + soft 清), 棠玥. Bad (reject these for female): 清明, 晴光, 光明, 浩然 — too plain/masculine.
   - MALE names should use aspiration / landscape / strength / bright-hard imagery: 昊 旭 景 峰 岳 崇 浩 涛 渊 钧 锐 锋 铭 松 柏. Avoid clearly feminine-coded chars (娇 媚 婷 蕊 莺 婉 妍) for males. Good male examples: 景渊, 浩然, 松柏, 钧朗. Bad (reject for male): 婉蕊, 媚娇.
   - When in doubt for a FEMALE, choose the softer/floral/lunar character over a bright-hard or plain one. A name that could read as a man's name is a FAILURE for a female request.
• 现代美感: timeless and legible; avoid dated (淑/芳/国/强) and over-trendy (梓/萱/轩) characters.
• 入诗不入名: NEVER use function words / particles that merely scan in a poem (之, 乎, 者, 也, 兮, 矣, 焉, 其, 而, 谁, 莫 …) or inauspicious characters, even if they appear in a pool line.

=== OUTPUT (return ONLY this JSON, no markdown, no extra text) ===
{
  "analysis": "1–2 English sentences: the BaZi profile and your naming strategy.",
  "candidates": [
    {
      "lineId": <number, an id from the pool>,
      "charSpan": "<contiguous substring of that pool line, in Chinese>",
      "surnameChar": "<surname character>",
      "givenChars": ["<given char>", "<optional 2nd given char>"],
      "meanings": { "<each given char>": "<short English meaning>" },
      "poeticMeaning": "<English, 2–3 sentences: the name's imagery and meaning>",
      "translation": "<English translation of the pool line you cited>",
      "tonePattern": "<English, e.g. 'rising + level + falling'>",
      "masterComment": "<English: why this name excels — phonetics + elements + meaning>"
    }
    // ... EXACTLY 6 candidates total
  ]
}
`.trim();
}

const fameLabel = (n: number): string =>
  n >= 3 ? "⭐经典" : n >= 2 ? "⭐名家" : "";

// 候选池块(每次请求不同,不缓存)。
export function buildPoolBlock(pool: ScoredPoem[]): string {
  const lines = pool
    .map(
      (p) =>
        `[id:${p.chunkId}] 《${p.title}》${p.author}(${p.dynasty}) ${fameLabel(
          p.fameScore
        )} "${p.chunkText}"`
    )
    .join("\n");
  return `=== VERIFIED POOL (the ONLY lines you may use; reference by id) ===\n${lines}`;
}

// 用户消息(本次命主信息 + 任务)。
export function buildComposerUserMessage(profile: ComposerProfile): string {
  const nameChars =
    profile.recommendedNameLength.includes("2 characters") &&
    !profile.recommendedNameLength.includes("3")
      ? "1 given character (2-char name total)"
      : profile.recommendedNameLength.includes("3 characters")
      ? "2 given characters (3-char name total)"
      : "1 or 2 given characters";

  return `
Profile of the person to be named:
- Gender: ${profile.gender}
- Day Master: ${profile.dayMaster} (${profile.strength})
- Favourable elements (喜用神, supply these): ${profile.favourableElements.join(", ") || "—"}
- Avoid elements (忌神, never use): ${profile.avoidElements.join(", ") || "—"}
- Recommended given-name length: ${nameChars}

${profile.surnameInstruction}

Candidate characters that carry the favourable elements (prefer drawing given characters from these, and they MUST also appear in your chosen pool line):
${profile.candidateChars.join(" ") || "(none provided)"}

TASK: Produce EXACTLY 6 candidates per the rules. Output ONLY the JSON object.
`.trim();
}

/** 调用取名先生,返回解析后的候选(已做防御式 JSON 解析)。 */
export async function runComposer(
  profile: ComposerProfile,
  pool: ScoredPoem[],
  feedback?: string // 评审先生的重生成反馈(可选)
): Promise<{ analysis: string; candidates: ComposerCandidate[] }> {
  const userMessage =
    buildComposerUserMessage(profile) +
    (feedback ? `\n\nREVISION FEEDBACK (fix these and resubmit 6 candidates):\n${feedback}` : "");

  const message = await claude.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.8,
    system: [
      {
        type: "text",
        text: createComposerSystemPrompt(),
        cache_control: { type: "ephemeral" },
      },
      { type: "text", text: buildPoolBlock(pool) },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const content = textBlock && "text" in textBlock ? textBlock.text : "";

  const parsed = parseJsonLoose(content);
  const candidates: ComposerCandidate[] = Array.isArray(parsed?.candidates)
    ? parsed.candidates.map((raw: unknown) => {
        const c = (raw ?? {}) as Record<string, unknown>;
        return {
          lineId: Number(c.lineId),
          charSpan: String(c.charSpan ?? ""),
          surnameChar: String(c.surnameChar ?? ""),
          givenChars: Array.isArray(c.givenChars)
            ? (c.givenChars as unknown[]).map(String)
            : [],
          poeticMeaning: c.poeticMeaning ? String(c.poeticMeaning) : undefined,
          translation: c.translation ? String(c.translation) : undefined,
          meanings:
            c.meanings && typeof c.meanings === "object"
              ? (c.meanings as Record<string, string>)
              : undefined,
          tonePattern: c.tonePattern ? String(c.tonePattern) : undefined,
          masterComment: c.masterComment ? String(c.masterComment) : undefined,
        };
      })
    : [];

  return { analysis: String(parsed?.analysis ?? ""), candidates };
}

// Claude 偶尔会用 markdown 包裹 JSON;先直解,失败再抽第一个 {...}。
function parseJsonLoose(text: string): { analysis?: string; candidates?: unknown[] } | null {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

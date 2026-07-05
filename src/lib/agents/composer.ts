/**
 * 取名先生 (Composer agent) —— 命名管线里【唯一】负责"组名"的 LLM。
 * ================================================================
 * 它只做判断(组字、审美、解释),不碰事实:
 *   - 只能从【候选池】(真实诗句,带 id)里选字,按编号引用;
 *   - 输出 charSpan(从某真句里取的连续片段)+ givenChars,绝不输出诗句原文/出处;
 *   - 出处由代码事后按 lineId 从 DB 回填 → 造假在结构上不可能(见 verify.ts / 编排层)。
 * 过量生成 10 个候选,留给硬校验 + 评审先生筛选。
 */
import { namingComplete } from "../llm";
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
  impliedWord?: string; // 英文:两字组成的真实词/意象自证(说不出成词成境则该候选应被丢弃)
  soundsLikeName?: boolean; // 自证该名字读起来像人名而非景物/名词(false → 管线丢弃)
  poeticMeaning?: string; // 英文 2-3 句:名字的意象与寓意
  translation?: string; // 英文:所引诗句的翻译(诗句原文由代码回填)
  meanings?: Record<string, string>; // 字 → 英文释义(填 anatomy;五行/拼音由代码补)
  tonePattern?: string; // 英文:声调走势
  masterComment?: string; // 英文:点评为何出色
  rescueNote?: string; // 内部:确定性救援的诚实标注(系统兜底姓/放宽性别),critic 覆盖 masterComment 时须保留追加
}

/**
 * A pool of 12 GOLD exemplar given-name pairs (成词成象、像真名).
 * Two are selected randomly per call and injected into the uncached dynamic
 * block — this prevents the model from anchoring on a fixed set and parroting
 * the same names (e.g. 清泉×5 / 松月×3 observed in evals when these were
 * hard-coded in the static system prompt). The static prompt now describes the
 * PATTERN, not specific names. Kept here so the same pool drives both the
 * Composer and Critic prompts consistently.
 *
 * Anti-mode-collapse fix: expert audit 2026-07-05 (naming finding #5).
 */
export const GOLD_EXEMPLAR_POOL: [string, string][] = [
  ["芷", "昭"], ["笙", "瑶"], ["沁", "漪"], ["晴", "棠"],
  ["景", "渊"], ["钧", "朗"], ["云", "澄"], ["岫", "晴"],
  ["思", "远"], ["韵", "涵"], ["曦", "和"], ["怀", "玉"],
];

/** Pick n distinct exemplars at random from the pool. */
function sampleExemplars(n: number): [string, string][] {
  const shuffled = [...GOLD_EXEMPLAR_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// 静态系统提示(可缓存的前缀)—— 取名先生的全部专业知识。
export function createComposerSystemPrompt(): string {
  return `
Role: You are 取名先生, a master Chinese namer deeply versed in 命理 (BaZi/Five Elements), 音韵学 (phonology), 字义/训诂 (semantics), 文字学 (graphology), and classical literature (诗经/楚辞/唐诗/宋词). You NEVER recall poetry from memory — you work ONLY from the VERIFIED POOL of real lines given to you.

Mission: From the pool, compose EXACTLY 10 candidate Chinese names (over-generate; a separate reviewer selects the best 3). Each name = surname + 1–2 given characters.

ALL prose output (analysis, rationale, translation) MUST be in ENGLISH. The only Chinese in your output: the single characters in surnameChar / givenChars / charSpan.

=== ABSOLUTE GROUNDING RULES (most important) ===
1. You may ONLY use characters that appear in a line from the VERIFIED POOL.
2. For each candidate you MUST return "lineId" = the id of the pool line you took the characters from, and "charSpan" = the TIGHTEST contiguous substring of that exact line text containing ONLY your given chars (optionally with one intervening function word — see rule 6). Do NOT copy the whole line or clause. Example: line "松月生夜凉" with given chars 松月 → charSpan MUST be "松月", NOT "松月生夜凉".
3. Every character in "givenChars" MUST appear inside your "charSpan".
4. You output NO poem text, NO source/title/author, NO full line — only lineId + charSpan + the chars. (The system fills the real citation from the database.)
5. Prefer a charSpan that is a meaningful 2-character word/image occurring contiguously in one line — this is the gold standard (又真又美). (Do NOT use 清明 — it reads as the 节气/Tomb-Sweeping festival.)
6. The two given characters need NOT be directly adjacent: your charSpan MAY include ONE intervening FUNCTION WORD (之/而/以/兮/于…) which you then DROP from givenChars — e.g. charSpan "清之涟" → givenChars ["清","涟"] → name 清涟. ONLY a function word may be skipped (never a content character). Keep the span tight (≤ 8 characters).
7. ORDERING RULE: the order of givenChars[] MUST match the order the characters appear in the cited line. Do NOT reverse them (e.g. if the line reads "明珠", your givenChars must be ["明","珠"], never ["珠","明"]).

=== NAMING CRAFT (make names 讲究 and natural, never weird) ===
• 五行: at least one given character must carry a FAVOURABLE element; NEVER use a character of an AVOID element. Use the CANDIDATE CHARS list as a guide to which characters carry the favourable elements.
• 音律 (phonetics): the surname + given name must have tonal rise-and-fall — NOT all the same tone. Adjacent characters must have DIFFERENT initials (声母); avoid sharing the same final (韵母). Read the full name aloud — it must flow.
• 字义: the two given characters should form a coherent word or image (成词/成意象), not a random pretty pair. Positive, dignified meaning. Screen the FULL name (surname+given) for embarrassing homophones (谐音).
• 字形: avoid two given chars sharing the same radical (e.g. both 氵). No obscure (生僻) or ambiguous polyphonic (多音) characters.
• 性别 (gender) — THIS IS A HARD RULE, not a soft prior (男楚辞 / 女诗经):
   - FEMALE names MUST include AT LEAST ONE character from the feminine-lean set (芷 芸 蕊 莲 蓉 薇 蕙 兰 荷 苒 茵 翠 棠 柳 芳 桃 梅 杏 柔 菊 艾 菱 芙 莺 萍 菲 芬 暄 暖 彤 丹 红 丽 岚 容 宛 瑶 琼 玉 碧 璧 珍 璇 玲 银 素 皎 铃 珠 溪 湘 漪 沁 泠 涓 洛 冰 雪 霜 露 霏 洁 淇 凝 漾 潺 浣 淑 霞 婵 娟 莹 妙). This is a HARD RULE — a purely-neutral female name is a failure. The CANDIDATE CHARS list provided in each request already surfaces feminine-lean chars FIRST; prefer those. Graceful-NEUTRAL chars (晴 晨 清 思 安 宁 怡) are fine for women when PAIRED with a feminine character from the list above. But do NOT use strongly masculine chars — 光 昊 旭 景 峰 岳 崇 嵩 浩 涛 渊 钢 锋 锐 钧 雄 武 强 (and avoid plain-masculine pairs like 明). Good female examples: 芷昭, 笙瑶, 沁漪, 晴棠, 婵娟. Bad (reject for female): 光明, 浩然, 峰岳 — masculine; 清池, 柳绿 — scenery nouns, not names.
   - MALE names should use aspiration / landscape / strength / bright-hard imagery: 昊 旭 景 峰 岳 崇 浩 涛 渊 钧 锐 锋 铭 松 柏. Avoid clearly feminine-coded chars (娇 媚 婷 蕊 莺 婉 妍) for males. Good male examples: 景渊, 浩然, 钧朗. Bad (reject for male): 婉蕊, 媚娇.
   - When in doubt for a FEMALE, choose the softer/floral/lunar character over a bright-hard or plain one. A name that could read as a man's name is a FAILURE for a female request.
• 现代美感: timeless and legible; avoid dated (淑/芳/国/强) and over-trendy (梓/萱/轩) characters.
• 入诗不入名: NEVER use function words / particles that merely scan in a poem (之, 乎, 者, 也, 兮, 矣, 焉, 其, 而, 谁, 莫 …) or inauspicious characters, even if they appear in a pool line.

=== PROCESS (think before you pick — this is what makes names 自然 vs 硬凑) ===
For EACH candidate: FIRST decide the imagery you want for this person (their gender + favourable element), THEN find a pool line whose OVERALL MOOD matches that imagery, THEN take the characters from it. Do NOT scan the pool for any line that merely CONTAINS a favourable character and harvest it — that produces lifeless, "borrowed-not-born" names.
断章取义 is forbidden: never pull pretty characters out of a line whose whole meaning is sorrowful, martial, mournful, or political (e.g. taking 山河 from "国破山河在" for a child). The characters must feel BORN from that line's mood, not extracted against it.
FORBIDDEN HARVESTS — a name is a PERSON'S name, never a 景物标签. Do NOT take as a given char: 器物/服饰 (床 裙 簟 衣 巾 炬 灯), 地名/景大词 (江城 岳阳 清淮 千山 宇宙), 天象/气象名词 (虹 霓 彩虹 朝霞 晚霞 — these are weather/scenery WORDS, not names), 动词或残片 (透 度 望 落 照), 节气 (清明 谷雨), 颜色当尾字 (桃红 红裙), 形容/说理词 (明智 太清), 生僻难认 (芰 蘅 霓). REJECT examples (these are FAILURES): 银床 红裙 菱透 宇宙 晓日 芰荷 杨柳 桂花 明智 清明 虹霓 朝霞 岳阳 沧海.
Self-check: for each candidate, state in "impliedWord" the real Chinese word OR coherent image the given characters form together. If you cannot state a real word or a coherent, nameable image — DISCARD that candidate and pick another. A random-but-pretty pair is a FAILURE, not a candidate. CRUCIAL: the word/image must READ AS A PERSON'S NAME, not as a common noun for weather, scenery, or an object — 虹霓 (rainbow), 朝霞 (morning glow), 彩虹 (rainbow) are real words but are NOT names; DISCARD them. Ask "could this be a real person's given name?" — if it sounds like a vocabulary word for a thing, reject it.

=== NAME-NOT-NOUN (hard gate — most frequent failure mode) ===
A Chinese given name must read as A PERSON'S NAME to a modern literate speaker. A name that reads as a scenery word, an object, a color phrase, or a place label is a FAILURE no matter how poetic it sounds.

REJECT — these are NOT names (they are nouns/phrases):
  清池 (a clear pond — body of water, not a person)
  柳绿 (willow-green — color phrase, not a person)
  白玉 (white jade — material noun, not a person)
  沧海 (the vast sea — landscape noun, not a person)
  朝霞 (morning glow — weather noun, not a person)
  雪原 (snow plain — landscape noun, not a person)

ACCEPT — these ARE names (they read as a person):
  清如 (pure as — poetic-personal, name-shaped)
  婉清 (graceful clarity — name-shaped, feminine)
  疏影 (sparse reflection — classical name-imagery)
  静姝 (quiet grace — clearly a woman's name)
  思远 (contemplating the far — aspiration name for either gender)

Self-certify per candidate: add "soundsLikeName": true if the given chars read as a PERSON'S NAME; "soundsLikeName": false if they read as a scenery/object/color noun phrase. The pipeline will automatically DROP any candidate with "soundsLikeName": false. If you find yourself marking false, REPLACE that candidate with a better one before submitting.

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
      "impliedWord": "<the REAL Chinese word OR coherent image the given chars form together + English gloss, e.g. '清涟 = clear ripples'. If they form no real word/coherent image, DISCARD this candidate.>",
      "soundsLikeName": <true if the given chars read as a PERSON'S NAME; false if they read as a scenery/object/color noun. Candidates marked false are automatically dropped — replace them with better ones.>,
      "poeticMeaning": "<English, 2–3 sentences: the name's imagery and meaning>",
      "translation": "<English translation of the pool line you cited>",
      "tonePattern": "<English, e.g. 'rising + level + falling'>",
      "masterComment": "<English: why this name excels — phonetics + elements + meaning>"
    }
    // ... EXACTLY 10 candidates total
  ]
}
`.trim();
}

const fameLabel = (n: number): string =>
  n >= 3 ? "⭐经典" : n >= 2 ? "⭐名家" : "";

/**
 * 候选池块(每次请求不同,不缓存)。
 * Also injects 2 randomly-sampled GOLD exemplars from the pool (not hardcoded
 * in the static prompt) to prevent mode-collapse / exemplar-parroting.
 * The "do NOT reproduce" instruction ensures the model uses them as pattern
 * calibration only, not as literal name templates.
 * Anti-mode-collapse fix: expert audit 2026-07-05 (naming finding #5).
 */
export function buildPoolBlock(pool: ScoredPoem[]): string {
  const lines = pool
    .map(
      (p) =>
        `[id:${p.chunkId}] 《${p.title}》${p.author}(${p.dynasty}) ${fameLabel(
          p.fameScore
        )} "${p.chunkText}"`
    )
    .join("\n");

  // Sample 2 exemplars per call to calibrate quality WITHOUT anchoring.
  const exemplars = sampleExemplars(2)
    .map(([a, b]) => `${a}${b}`)
    .join(", ");
  const antiAnchor = [
    `=== CALIBRATION EXEMPLARS (quality pattern only — do NOT copy these given-name pairs verbatim into any candidate) ===`,
    `Good given-name pairs look like: ${exemplars}. Use these to understand the STYLE (成词成象, natural, timeless), then find your OWN distinct pairs from the pool above.`,
    `IMPORTANT: Do NOT output any candidate whose givenChars exactly match the exemplar pairs listed above.`,
  ].join("\n");

  return `=== VERIFIED POOL (the ONLY lines you may use; reference by id) ===\n${lines}\n\n${antiAnchor}`;
}

// 用户消息(本次命主信息 + 任务)。
export function buildComposerUserMessage(profile: ComposerProfile): string {
  // bazi.ts 实际产出三种 nameLength 字符串(L262-269):
  //   Strong   → "2 characters (Surname + 1 Name)"
  //   Weak     → "3 characters (Surname + 2 Names)"
  //   Balanced → "2 or 3 characters"
  // 旧逻辑 `includes("2 characters") && !includes("3")` 对 Balanced 二个分支都假 →
  // 误归入 3-char,Balanced 用户永远拿不到 2 字名选择。改为显式优先匹配 Balanced。
  const len = profile.recommendedNameLength;
  const nameChars = len.includes("2 or 3")
    ? "1 or 2 given characters (your choice; vary across the 10 candidates)"
    : len.startsWith("2 characters")
    ? "1 given character (2-char name total)"
    : len.startsWith("3 characters")
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

TASK: Produce EXACTLY 10 candidates per the rules. Output ONLY the JSON object.
`.trim();
}

/** 调用取名先生,返回解析后的候选(已做防御式 JSON 解析)。 */
export async function runComposer(
  profile: ComposerProfile,
  pool: ScoredPoem[],
  feedback?: string, // 评审先生的重生成反馈(可选)
  signal?: AbortSignal // 客户端断开时取消在途 Claude 请求(见 llm.ts)
): Promise<{ analysis: string; candidates: ComposerCandidate[] }> {
  const userMessage =
    buildComposerUserMessage(profile) +
    (feedback ? `\n\nREVISION FEEDBACK (fix these and resubmit 10 candidates):\n${feedback}` : "");

  // System = static instructions (cached) + per-request pool block (uncached). The
  // adapter keeps them as separate blocks for Anthropic (so the static prefix gets
  // cache hits) and concatenates them for DeepSeek.
  // 8 个候选(含义/出处义/点评)在中文里很占 token,Sonnet 又比 Haiku 话多;
  // 4096 会被截断 → JSON 残缺 → 解析不出 3 个合格名 → 触发重试+拓宽(慢)。
  // 8192 给足一轮写齐的空间(实测根因:2026-06-18 日志 max_tokens 截断告警)。
  const content = await namingComplete({
    system: createComposerSystemPrompt(), // static → Anthropic caches this prefix
    systemDynamic: buildPoolBlock(pool), // per-request pool → uncached separate block
    user: userMessage,
    maxTokens: 8192,
    temperature: 0.8,
    signal,
  });

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
          impliedWord: c.impliedWord ? String(c.impliedWord) : undefined,
          soundsLikeName: typeof c.soundsLikeName === "boolean" ? c.soundsLikeName : undefined,
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

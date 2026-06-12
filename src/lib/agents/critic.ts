/**
 * 评审先生 (Critic agent) —— evaluator-optimizer 的"评审"端。
 * ============================================================
 * 候选名已过【硬校验闸门】(出处真实、五行对、无黑名单、声调不全同、声母不撞),
 * 即"事实"已保证。评审先生只评【审美与讲究】(自然度、成词、性别契合、现代美感、
 * 叠韵、出处雅俗),给 6 个候选打分、挑最好的 3 个、写一句点评。
 * 它【不碰事实】—— 不判断字在不在句里(那是代码的事)。
 */
import { getClaude } from "../claude";
import type { ScoredPoem } from "../retriever";
import type { ComposerCandidate, ComposerProfile } from "./composer";
import { pinyinOf } from "../namechars";

const MODEL = "claude-sonnet-4-20250514";

export interface CriticRanking {
  idx: number; // 候选在传入数组中的下标
  score: number; // 0~100
  accept: boolean;
  comment?: string; // 一句英文点评(可作 masterComment)
}

export function createCriticSystemPrompt(): string {
  return `
Role: You are 评审先生, a senior Chinese-naming critic. You judge TASTE, not facts — every candidate has ALREADY been verified to cite a real poem line and to carry the correct Five Elements. Do NOT re-check whether characters are in the line.

Score EACH candidate 0–100 using this weighted rubric (this product's soul is REAL-poem grounding, so 意境 & 出处 matter):
- 性别 gender fit (17%): imagery suits the stated gender per 男楚辞/女诗经. A clear clash is a near-veto (see auto-reject below).
- 音律 phonetics (17%): tonal rise-and-fall; avoid 上声相连 (third-tone sandhi 拗口) and all-oblique; flows when read aloud. (双声/叠韵 is a mild deduction, not fatal.)
- 字义 semantic naturalness (16%): the two given chars form a coherent word/image — judge the candidate's own "impliedWord": does it name a REAL word or a coherent image, or is it a contrived pretty-but-meaningless pair? A weak/forced/absent impliedWord is a strong deduction.
- 意境承接 imagery coherence (15%): does the name's imagery HARMONIZE with the WHOLE mood of the cited line? Penalize 断章取义 — pretty chars pulled from a line whose overall meaning is sorrowful, martial, mournful, or political (e.g. 山河 from "国破山河在"). The chars should feel BORN from that line's mood, not extracted against it.
- 出处 poetic source (10%): apt, dignified source; bonus if the chars form a real word within the cited line and the source is famous (marked ⭐).
- 五行 element fit (10%): favourable element well-placed and balanced.
- 与姓搭配 surname harmony (8%): full name flows; no embarrassing 谐音; no meaning clash.
- 现代美感 modern aesthetics (7%): timeless, legible; not dated (淑/芳/国/强) nor over-trendy (梓/萱/轩); not 太直白 (e.g. 宇宙 = "universe").

GENDER AUTO-REJECT (mandatory): Set accept=false AND score ≤ 40 for any name whose imagery CLEARLY clashes with the stated gender. For a FEMALE: a name built from strongly masculine/martial/landscape characters (光 昊 旭 景 峰 岳 崇 嵩 浩 涛 渊 钢 锋 锐 钧 雄 武 强, e.g. 光明 / 浩然 / 峰岳) is a FAILURE. Note: graceful-NEUTRAL chars (晴 晨 清 思 安 宁) are NOT a clash for women — judge the whole name (晴雯 is fine; only flag if it reads distinctly male). For a MALE: a name built from soft floral/delicate feminine characters (娇 媚 婷 蕊 莺 婉 妍, e.g. 婉蕊) is a FAILURE.

NATURALNESS AUTO-REJECT (mandatory): Set accept=false AND score ≤ 45 for any name that reads as something OTHER than a person's name — i.e. an object/garment (银床 红裙), a place/landscape-noun (江城 宇宙), a colour word (桃红), a solar-term (清明 — 节气联想), a plain adjective/aphorism (明智 太清), a plant-compound that reads like a species name (桂花 杨柳 — 老气/植物名), a plain dictionary word (光明 = "brightness"), a景物标签 (晓日), or contains a 生僻 hard-to-read char (芰 蘅). Ask: "would a literate modern parent actually NAME a child this?" If it sounds like a scene, an object, or an adjective — reject. GOLD names to calibrate against: 松月 清泉 青溪 明月 涵虚 晓露 苍山.

Also mark accept=false if the name reads weird/contrived, is a random char pair, is dated/trendy/too-literal, has a bad full-name homophone, or its tones are monotonous.

Select the BEST names; prefer variety in imagery/source across the top picks (don't pick three near-identical names). Write a ONE-LINE English comment per candidate explaining the verdict.

Return ONLY this JSON (no markdown):
{ "rankings": [ { "idx": <number>, "score": <0-100>, "accept": <true|false>, "comment": "<one line English>" } ] }
`.trim();
}

export async function runCritic(
  profile: ComposerProfile,
  candidates: ComposerCandidate[],
  pool: ScoredPoem[]
): Promise<CriticRanking[]> {
  if (candidates.length === 0) return [];

  const lineOf = (id: number) =>
    pool.find((p) => p.chunkId === id)?.chunkText ?? "";

  const fameLabel = (id: number) => {
    const n = pool.find((p) => p.chunkId === id)?.fameScore ?? 1;
    return n >= 3 ? "⭐经典" : n >= 2 ? "⭐名家" : "";
  };

  const list = candidates
    .map((c, i) => {
      const full = c.surnameChar + c.givenChars.join("");
      const py = [c.surnameChar, ...c.givenChars]
        .map((ch) => pinyinOf(ch).pinyin)
        .join(" ");
      return `[${i}] ${full} (${py}) — 给定字: ${c.givenChars.join(
        ""
      )} — impliedWord: ${c.impliedWord ?? "—"} — 出自${fameLabel(
        c.lineId
      )}: "${lineOf(c.lineId)}"`;
    })
    .join("\n");

  const userMessage = `
Person: ${profile.gender}, Day Master ${profile.dayMaster} (${profile.strength}), favourable elements ${profile.favourableElements.join("/") || "—"}.

Candidates (all already verified authentic & element-valid — judge taste only):
${list}

Score every candidate and return ONLY the JSON.`.trim();

  const message = await getClaude().messages.create({
    model: MODEL,
    max_tokens: 2048,
    temperature: 0.4,
    system: [
      {
        type: "text",
        text: createCriticSystemPrompt(),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const content = textBlock && "text" in textBlock ? textBlock.text : "";

  let parsed: { rankings?: unknown[] } | null = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        parsed = null;
      }
    }
  }

  if (!parsed || !Array.isArray(parsed.rankings)) return [];
  return parsed.rankings.map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const score = Number(r.score) || 0;
    // accept 缺省策略:严格三态。Claude 偶尔会漏掉 accept 字段,旧代码 `r.accept !== false`
    // 在缺省时默认 true → 性别明显冲突的候选若 LLM 忘标 accept=false,会获得 +1000 排序加成
    // 蹿到前 3。新策略:① 显式 true → accept ② 显式 false → reject ③ 缺省 → 退回分数门槛
    // (≥60 才视为 accept),与 prompt 中"GENDER AUTO-REJECT … score ≤ 40"互相印证。
    const accept =
      r.accept === true ? true : r.accept === false ? false : score >= 60;
    return {
      idx: Number(r.idx),
      score,
      accept,
      comment: r.comment ? String(r.comment) : undefined,
    };
  });
}

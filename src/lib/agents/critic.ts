/**
 * 评审先生 (Critic agent) —— evaluator-optimizer 的"评审"端。
 * ============================================================
 * 候选名已过【硬校验闸门】(出处真实、五行对、无黑名单、声调不全同、声母不撞),
 * 即"事实"已保证。评审先生只评【审美与讲究】(自然度、成词、性别契合、现代美感、
 * 叠韵、出处雅俗),给 6 个候选打分、挑最好的 3 个、写一句点评。
 * 它【不碰事实】—— 不判断字在不在句里(那是代码的事)。
 */
import { claude } from "../claude";
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

Score EACH candidate 0–100 using this weighted rubric (this product's soul is REAL-poem grounding, so 出处 & 五行 matter):
- 性别 gender fit (18%): imagery suits the stated gender per 男楚辞/女诗经. A clear clash is a near-veto (see auto-reject below).
- 音律 phonetics (18%): tonal rise-and-fall; avoid 上声相连 (third-tone sandhi 拗口) and all-oblique; flows when read aloud. (双声/叠韵 is a mild deduction, not fatal.)
- 字义 semantic naturalness (17%): the two given chars form a coherent word/image (成词/成意象), not a random pretty pair; positive, dignified meaning.
- 出处 poetic authenticity (15%): a famous, apt source; the chars form a real word within the cited line (gold standard).
- 五行 element fit (15%): favourable element well-placed and balanced.
- 与姓搭配 surname harmony (10%): full name flows; no embarrassing 谐音; no meaning clash.
- 现代美感 modern aesthetics (7%): timeless, legible; not dated (淑/芳/国/强) nor over-trendy (梓/萱/轩); not 太直白 (e.g. 宇宙 = "universe" reads literal).

GENDER AUTO-REJECT (mandatory): Set accept=false AND score ≤ 40 for any name whose imagery CLEARLY clashes with the stated gender. For a FEMALE: a name built from strongly masculine/martial/landscape characters (光 昊 旭 景 峰 岳 崇 嵩 浩 涛 渊 钢 锋 锐 钧 雄 武 强, e.g. 光明 / 浩然 / 峰岳) is a FAILURE. Note: graceful-NEUTRAL chars (晴 晨 清 思 安 宁) are NOT a clash for women — judge the whole name (晴雯 is fine; only flag if it reads distinctly male). For a MALE: a name built from soft floral/delicate feminine characters (娇 媚 婷 蕊 莺 婉 妍, e.g. 婉蕊) is a FAILURE.

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

  const list = candidates
    .map((c, i) => {
      const full = c.surnameChar + c.givenChars.join("");
      const py = [c.surnameChar, ...c.givenChars]
        .map((ch) => pinyinOf(ch).pinyin)
        .join(" ");
      return `[${i}] ${full} (${py}) — 给定字: ${c.givenChars.join("")} — 出自: "${lineOf(
        c.lineId
      )}"`;
    })
    .join("\n");

  const userMessage = `
Person: ${profile.gender}, Day Master ${profile.dayMaster} (${profile.strength}), favourable elements ${profile.favourableElements.join("/") || "—"}.

Candidates (all already verified authentic & element-valid — judge taste only):
${list}

Score every candidate and return ONLY the JSON.`.trim();

  const message = await claude.messages.create({
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
    return {
      idx: Number(r.idx),
      score: Number(r.score) || 0,
      accept: r.accept !== false,
      comment: r.comment ? String(r.comment) : undefined,
    };
  });
}

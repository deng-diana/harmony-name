/**
 * 命名管线编排 (orchestrator) —— 把零件串成完整流程。
 * =====================================================
 *   ① 喜用神 → 候选字(字库) + 意象词 → 真实候选池(retriever)
 *   ② 取名先生 Composer 组 6 个候选(只回引用编号 + 字)
 *   ③ 硬校验闸门 verify 过滤;不足 3 个则带反馈重生成一轮(轻量 evaluator-optimizer)
 *   ④ 出处由代码【按 lineId 从候选池/DB 回填】+ 五行/拼音由代码补 → 造假不可能
 * 评审先生 Critic(Step 6)将插在 ③ 之后做审美打分;此处先用"校验+重生成"兜底。
 */
import { buildVerifiedPool, type ScoredPoem } from "../retriever";
import {
  runComposer,
  type ComposerProfile,
  type ComposerCandidate,
} from "../agents/composer";
import { verifyCandidate, type VerifyContext } from "../verify";
import { candidateCharsFor, elementOfChar, pinyinOf } from "../namechars";
import { COMMON_SURNAMES } from "../surnames";
import type { NameOption } from "../../types";

// 五行 → 语义检索意象词(原在 route.ts,内聚到管线)
const ELEMENT_IMAGERY: Record<string, string> = {
  Wood: "春天 生长 树木 青翠 仁德 东风",
  Fire: "光明 热情 朝阳 辉煌 礼仪 南方",
  Earth: "大地 厚德 稳重 丰收 信义 中央",
  Metal: "秋天 坚毅 清白 明月 义气 西方",
  Water: "流水 智慧 深远 润泽 冬天 北方",
};

const SURNAME_MAP = new Map(COMMON_SURNAMES.map((s) => [s.chinese, s]));

export interface PipelineInput {
  gender: "male" | "female";
  dayMaster: string;
  strength: string;
  favourableElements: string[];
  avoidElements: string[];
  recommendedNameLength: string;
  surnameInstruction: string;
}

export interface PipelineResult {
  names: NameOption[];
  analysis?: string;
}

type ProgressFn = (step: number, total: number, message: string) => void;
const TOTAL = 4;

export async function runNamingPipeline(
  input: PipelineInput,
  opts: { onProgress?: ProgressFn } = {}
): Promise<PipelineResult> {
  const onProgress = opts.onProgress ?? (() => {});

  // ① 候选字 + 候选池
  onProgress(1, TOTAL, "Searching real classical lines…");
  const candidateChars = candidateCharsFor(input.favourableElements, input.gender);
  const imageryQuery =
    "中国古典诗词 " +
    input.favourableElements.map((e) => ELEMENT_IMAGERY[e] || e).join(" ");
  const pool = await buildVerifiedPool({
    favourableChars: candidateChars,
    imageryQuery,
  });
  if (pool.length === 0) return { names: [] }; // 调用方据此退款

  const profile: ComposerProfile = {
    gender: input.gender,
    dayMaster: input.dayMaster,
    strength: input.strength,
    favourableElements: input.favourableElements,
    avoidElements: input.avoidElements,
    recommendedNameLength: input.recommendedNameLength,
    surnameInstruction: input.surnameInstruction,
    candidateChars,
  };
  const ctx: VerifyContext = {
    pool,
    favourableElements: input.favourableElements,
    avoidElements: input.avoidElements,
    gender: input.gender,
  };

  // ② 取名先生组名
  onProgress(2, TOTAL, "The naming master is composing…");
  const first = await runComposer(profile, pool);
  let analysis = first.analysis;

  // ③ 校验,不足 3 个则带反馈重生成一轮
  onProgress(3, TOTAL, "Verifying authenticity…");
  let verified = passing(first.candidates, ctx);

  if (verified.length < 3) {
    const failed = first.candidates
      .map((c) => ({ c, r: verifyCandidate(c, ctx) }))
      .filter((x) => !x.r.ok)
      .slice(0, 6)
      .map(
        (x) =>
          `- ${x.c.surnameChar}${x.c.givenChars.join("")}: ${x.r.reasons.join("; ")}`
      )
      .join("\n");
    const retry = await runComposer(profile, pool, failed);
    if (!analysis) analysis = retry.analysis;
    verified = dedupe([...verified, ...passing(retry.candidates, ctx)]);
  }

  // ④ 回填出处 + 五行/拼音 → NameOption
  onProgress(4, TOTAL, "Revealing your names…");
  const names = verified.slice(0, 3).map((c) => hydrate(c, pool));
  return { names, analysis };
}

function passing(
  candidates: ComposerCandidate[],
  ctx: VerifyContext
): ComposerCandidate[] {
  return dedupe(candidates.filter((c) => verifyCandidate(c, ctx).ok));
}

function dedupe(cands: ComposerCandidate[]): ComposerCandidate[] {
  const seen = new Set<string>();
  const out: ComposerCandidate[] = [];
  for (const c of cands) {
    const key = c.surnameChar + c.givenChars.join("");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

// 把候选名"水化"成前端契约 NameOption —— 出处/原文一律来自候选池(代码),非 LLM 文本。
function hydrate(c: ComposerCandidate, pool: ScoredPoem[]): NameOption {
  const line = pool.find((p) => p.chunkId === c.lineId);

  // 在 charSpan 内把名字字用 {} 包起来,再嵌回真句
  const braced = [...c.charSpan]
    .map((ch) => (c.givenChars.includes(ch) ? `{${ch}}` : ch))
    .join("");
  // 用 indexOf 定位再切片,而非 replace —— replace 只替换首个匹配,
  // 若 charSpan 在同一句里多次出现会把大括号标到错误位置。
  const idx = line ? line.chunkText.indexOf(c.charSpan) : -1;
  const original =
    line && idx >= 0
      ? line.chunkText.slice(0, idx) +
        braced +
        line.chunkText.slice(idx + c.charSpan.length)
      : line?.chunkText ?? "";
  const source = line
    ? `《${line.title}》— ${line.author} (${line.dynasty})`
    : "";

  const surnameInfo = SURNAME_MAP.get(c.surnameChar);
  const anatomy = [
    {
      char: c.surnameChar,
      pinyin: pinyinOf(c.surnameChar).pinyin,
      meaning: surnameInfo?.meaning ?? "",
      type: "Surname",
      element: surnameInfo?.wuxing ?? elementOfChar(c.surnameChar) ?? "",
    },
    ...c.givenChars.map((ch) => ({
      char: ch,
      pinyin: pinyinOf(ch).pinyin,
      meaning: c.meanings?.[ch] ?? "",
      type: "Given Name",
      element: elementOfChar(ch) ?? "",
    })),
  ];

  // tonePattern 不在 NameOption 契约内 → 并入 masterComment,避免丢失
  const masterComment = c.tonePattern
    ? `${c.masterComment ?? ""}${c.masterComment ? " " : ""}(${c.tonePattern})`.trim()
    : c.masterComment ?? "";

  return {
    hanzi: c.surnameChar + c.givenChars.join(""),
    pinyin: anatomy.map((a) => a.pinyin).join(" "),
    poeticMeaning: c.poeticMeaning ?? "",
    culturalHeritage: { source, original, translation: c.translation ?? "" },
    anatomy,
    masterComment,
  };
}

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
import { runCritic } from "../agents/critic";
import {
  candidateCharsFor,
  elementOfChar,
  isGenderClashing,
  isGenderForbidden,
  isHardBlacklisted,
  pinyinOf,
} from "../namechars";
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
  /** 用户指定的姓字(specified/from_common 模式)—— 让 deterministic 救援能用上 */
  surnameChar?: string;
}

export interface PipelineResult {
  names: NameOption[];
  analysis?: string;
}

type ProgressFn = (step: number, total: number, message: string) => void;
const TOTAL = 5;

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
  let pool = await buildVerifiedPool({
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
  let ctx: VerifyContext = {
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
    verified = dedupe([...verified, ...passing(retry.candidates, ctx)], ctx);
  }

  // ③.5 兜底:重生成后仍 <3 → 拓宽检索(更多候选字×更多真句)+ 允许单字名,再生成一轮。
  // 针对喜用神受限的命盘(如女命忌水木、喜用全偏阳),保证基本能凑满 3 个而不破质量底线。
  if (verified.length < 3) {
    onProgress(3, TOTAL, "Broadening the search for more options…");
    const broader = await buildVerifiedPool({
      favourableChars: candidateChars,
      imageryQuery,
      perArm: 40,
      cap: 45,
    });
    const seen = new Set(pool.map((p) => p.chunkId));
    pool = [...pool, ...broader.filter((p) => !seen.has(p.chunkId))];
    ctx = { ...ctx, pool };
    const broadenFeedback =
      `Only ${verified.length} valid name(s) so far — the favourable elements are constrained. ` +
      `Produce SINGLE-character given names: surname + ONE favourable, gender-appropriate character ` +
      `that appears in a pool line (e.g. 苏瑶, 苏晗, 苏昭). These are abundant and elegant. Give 6.`;
    // 兜底强制单字名(姓+1):双字名在受限喜用神下语料稀缺,单字名几乎必过。
    const rescueProfile: ComposerProfile = {
      ...profile,
      recommendedNameLength: "2 characters (Surname + 1 Name)",
    };
    const rescue = await runComposer(rescueProfile, pool, broadenFeedback);
    if (!analysis) analysis = rescue.analysis;
    verified = dedupe([...verified, ...passing(rescue.candidates, ctx)], ctx);
  }

  // ③.6 终极兜底(deterministic):仍 <3 → 纯代码从池子里扫"喜用神+性别合宜"的单字,
  // 与姓配成 2 字名,无需 LLM,几乎必过校验。点评/寓意用极简模板填充(诚实交代)。
  // 这是"always-3"的最终保险,只在 LLM 多次随机后仍凑不齐时启动。
  if (verified.length < 3) {
    // 优先级:用户指定姓 > LLM 已经成功用过的姓 > 兜底常用姓(李,中国人口最多)。
    // 旧实现在 auto 模式下若 LLM 完全没出过 candidate(parse 全失败/refusal)→
    // surnameForRescue="" → 整个 rescue 被静默跳过,always-3 落空。落到 "李" 作为
    // last-mile 默认值,确保即使 LLM 全军覆没也能交付 ≥1 个名(诚实标注在 masterComment)。
    const FALLBACK_SURNAME = "李";
    const surnameForRescue =
      input.surnameChar ||
      verified[0]?.surnameChar ||
      first.candidates[0]?.surnameChar ||
      FALLBACK_SURNAME;
    const isFallback = surnameForRescue === FALLBACK_SURNAME && !input.surnameChar;
    const rescued = rescueDeterministic(
      surnameForRescue,
      ctx,
      3 - verified.length,
      isFallback
    );
    verified = dedupe([...verified, ...rescued], ctx);
  }

  // ④ 评审先生打分排序、挑最自然的 3 个(评审失败则优雅降级用校验顺序)
  onProgress(4, TOTAL, "The review master is judging…");
  let ordered = verified;
  if (verified.length > 1) {
    try {
      const rankings = await runCritic(profile, verified, pool);
      if (rankings.length > 0) {
        // byIdx 保护:LLM 偶尔会返回:
        //   ① 重复 idx —— Map 会 last-write-wins,旧实现静默覆盖 score(可能丢真分);
        //   ② 越界 idx(>= verified.length) 或 NaN —— Map.get 返回 undefined,排序为 0;
        //   ③ 漏标某些 idx —— 同样退化为 0,失去评审信号。
        // 新策略:校验 idx ∈ [0, N) 且为整数;同一 idx 多次出现保留 score 最高那个;
        //        漏标的候选默认 score=50 / accept=true,确保不被无差别沉底。
        const N = verified.length;
        const byIdx = new Map<number, typeof rankings[number]>();
        for (const r of rankings) {
          if (!Number.isInteger(r.idx) || r.idx < 0 || r.idx >= N) continue;
          const prev = byIdx.get(r.idx);
          if (!prev || r.score > prev.score) byIdx.set(r.idx, r);
        }
        const sortKey = (i: number) => {
          const r = byIdx.get(i);
          if (!r) return 50; // 未评中性分,不被刷到最底
          return (r.accept ? 1000 : 0) + r.score; // 通过者优先,再按分数
        };
        ordered = verified
          .map((c, i) => {
            const r = byIdx.get(i);
            if (r?.comment) c.masterComment = r.comment; // 用评审点评覆盖
            return { c, i };
          })
          .sort((a, b) => sortKey(b.i) - sortKey(a.i))
          .map((x) => x.c);
      }
    } catch (e) {
      console.error("Critic failed, using verify order:", e instanceof Error ? e.message : e);
    }
  }

  // ⑤ 回填出处 + 五行/拼音 → NameOption(出处一律来自候选池,非 LLM 文本)
  onProgress(5, TOTAL, "Revealing your names…");
  const names = ordered.slice(0, 3).map((c) => hydrate(c, pool));
  return { names, analysis };
}

function passing(
  candidates: ComposerCandidate[],
  ctx: VerifyContext
): ComposerCandidate[] {
  return dedupe(candidates.filter((c) => verifyCandidate(c, ctx).ok), ctx);
}

/**
 * 按"姓+名"去重 —— 同名出现多次时,留【出处更好】的那一个。
 * 旧实现简单保留 first occurrence,导致 retry 阶段产出的同名但 lineId/charSpan 更佳
 * (更高 fameScore 或更长 charSpan)的候选被丢弃。新策略:
 *   先按 quality 分组择优(fameScore desc, then charSpan length desc),再按原顺序输出。
 * 不传 ctx 也能用(测试便利),传了则取 pool 上的 fameScore。
 */
function dedupe(
  cands: ComposerCandidate[],
  ctx?: VerifyContext
): ComposerCandidate[] {
  const fameOf = (lineId: number): number =>
    ctx?.pool.find((p) => p.chunkId === lineId)?.fameScore ?? 0;
  const quality = (c: ComposerCandidate): number =>
    fameOf(c.lineId) * 100 + (c.charSpan?.length ?? 0);

  // ① 按 hanzi 分组,在每组里挑 quality 最高
  const bestByKey = new Map<string, ComposerCandidate>();
  const firstIndexByKey = new Map<string, number>();
  cands.forEach((c, i) => {
    const key = c.surnameChar + c.givenChars.join("");
    const prev = bestByKey.get(key);
    if (!prev || quality(c) > quality(prev)) bestByKey.set(key, c);
    if (!firstIndexByKey.has(key)) firstIndexByKey.set(key, i);
  });
  // ② 按 first-seen 顺序输出(保持原始排序稳定性)
  return [...bestByKey.entries()]
    .sort((a, b) => firstIndexByKey.get(a[0])! - firstIndexByKey.get(b[0])!)
    .map(([, c]) => c);
}

/**
 * Deterministic 兜底 —— 不调 LLM,纯代码从池子里找"喜用神+性别合宜"的单字,
 * 与姓配 2 字名(姓+1)。几乎必过校验。点评/寓意用极简模板填,如实标"single-char"风格。
 * 仅在 LLM 多轮兜底后仍 <3 时启动 —— 保证 always-3。
 */
function rescueDeterministic(
  surnameChar: string,
  ctx: VerifyContext,
  needed: number,
  isFallbackSurname = false
): ComposerCandidate[] {
  if (needed <= 0 || !surnameChar) return [];
  const out: ComposerCandidate[] = [];
  const usedChars = new Set<string>();
  // 兜底姓时在 masterComment 末尾追加诚实提示,便于前端日志/排查;
  // 用户不会因此误以为"系统坚信你应该姓李"。
  const fallbackNote = isFallbackSurname
    ? " (System-assigned surname; the AI did not converge on a candidate this round.)"
    : "";

  for (const line of ctx.pool) {
    if (out.length >= needed) break;
    for (const ch of line.chunkText) {
      if (out.length >= needed) break;
      if (usedChars.has(ch)) continue;
      // 必须:在字库内可识别五行 且 属喜用神
      const el = elementOfChar(ch);
      if (!el || !ctx.favourableElements.includes(el)) continue;
      // 排除明显不合:黑名单 / 性别禁用 / 性别倾向冲突
      if (isHardBlacklisted(ch)) continue;
      if (ctx.gender && isGenderForbidden(ch, ctx.gender)) continue;
      if (ctx.gender && isGenderClashing(ch, ctx.gender)) continue;
      // 与姓不能同字(避免 苏苏 之类)
      if (ch === surnameChar) continue;

      const candidate: ComposerCandidate = {
        lineId: line.chunkId,
        charSpan: ch,
        surnameChar,
        givenChars: [ch],
        meanings: { [ch]: `${el} element` },
        poeticMeaning: `Drawn from ${line.author}'s 《${line.title}》, this single-character name carries the ${el} essence with quiet classical grace.`,
        masterComment: `A graceful single-character name (姓+1),verifiably grounded in a real ${line.dynasty}-dynasty line.${fallbackNote}`,
      };
      const r = verifyCandidate(candidate, ctx);
      if (r.ok) {
        usedChars.add(ch);
        out.push(candidate);
      }
    }
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

/**
 * 命名管线编排 (orchestrator) —— 把零件串成完整流程。
 * =====================================================
 *   ① 喜用神 → 候选字(字库) + 意象词 → 真实候选池(retriever)
 *   ② 取名先生 Composer 组 6 个候选(只回引用编号 + 字)
 *   ③ 硬校验闸门 verify 过滤;零通过则带反馈重生成一轮(轻量 evaluator-optimizer)
 *      仍零通过 → 确定性兜底 rescue (1 name floor, no LLM)
 *   ④ 出处由代码【按 lineId 从候选池/DB 回填】+ 五行/拼音由代码补 → 造假不可能
 * 评审先生 Critic 仅在 >3 候选时启动做审美打分排序(≤3 候选直接输出,无需裁剪)。
 */
import { buildVerifiedPool, type ScoredPoem } from "../retriever";
import {
  runComposer,
  type ComposerProfile,
  type ComposerCandidate,
} from "../agents/composer";
import { verifyCandidate, deriveGroundedSpan, type VerifyContext } from "../verify";
import { runCritic } from "../agents/critic";
import { candidateCharsFor, elementOfChar, pinyinOf } from "../namechars";
import { rescueDeterministic } from "./rescue";
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

// Composer 安全包装:一次 Claude API 异常(529 过载/超时/SDK 重试耗尽)不应炸掉整条
// 管线 —— 否则已通过校验的 1~2 个合法名 + ③.6 纯代码兜底全被连坐。失败时降级为
// "这一轮 0 候选",自然落入下一兜底层,最终走到确定性救援保 floor-1。
async function safeComposer(
  profile: ComposerProfile,
  pool: ScoredPoem[],
  feedback?: string
): Promise<{ analysis: string; candidates: ComposerCandidate[] }> {
  try {
    return await runComposer(profile, pool, feedback);
  } catch (e) {
    console.error(
      "Composer call failed, degrading to next tier:",
      e instanceof Error ? e.message : e
    );
    return { analysis: "", candidates: [] };
  }
}

export async function runNamingPipeline(
  input: PipelineInput,
  opts: { onProgress?: ProgressFn } = {}
): Promise<PipelineResult> {
  const onProgress = opts.onProgress ?? (() => {});

  // Observability counters — emitted as a single JSON line at the end of each run.
  let round1Verified = 0;
  let composerCalls = 1; // starts at 1 for the initial composer call
  let deterministicRescueFired = false;
  let usedFallbackSurname = false;

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
    requireTwoGivenChars: true, // 正常只出双字名(姓+2);单字仅由确定性兜底产出
    expectedSurname: input.surnameChar, // 指定姓模式才有值;auto 模式 undefined → 不校验
  };

  // ② 取名先生组名
  onProgress(2, TOTAL, "The naming master is composing…");
  const first = await safeComposer(profile, pool);
  let analysis = first.analysis;

  // ③ 校验;只有 0 个通过时才带反馈重生成一轮(evaluator-optimizer lightweight retry).
  // 1–2 verified names are accepted as-is — no slow rescue ladder.
  onProgress(3, TOTAL, "Verifying authenticity…");
  let verified = passing(first.candidates, ctx);
  round1Verified = verified.length;

  if (verified.length < 1) {
    composerCalls++;
    const failed = first.candidates
      .map((c) => ({ c, r: verifyCandidate(c, ctx) }))
      .filter((x) => !x.r.ok)
      .slice(0, 6)
      .map(
        (x) =>
          `- ${x.c.surnameChar}${x.c.givenChars.join("")}: ${x.r.reasons.join("; ")}`
      )
      .join("\n");
    const retry = await safeComposer(profile, pool, failed);
    if (!analysis) analysis = retry.analysis;
    verified = dedupe([...verified, ...passing(retry.candidates, ctx)], ctx);
  }

  // ③.6 Deterministic rescue: both composer rounds produced zero usable names →
  // pure-code scan of the pool for favourable-element name-suitable chars.
  // Produces exactly 1 surname+1 name (姓+1) — honest annotation in masterComment.
  // No LLM, near-instant, structurally grounded. The "never return 0 names" guarantee.
  if (verified.length === 0) {
    // Priority: user-specified surname > surname from any LLM candidate > fallback 李.
    const FALLBACK_SURNAME = "李";
    const surnameForRescue =
      input.surnameChar ||
      verified[0]?.surnameChar ||
      first.candidates[0]?.surnameChar ||
      FALLBACK_SURNAME;
    const isFallback = surnameForRescue === FALLBACK_SURNAME && !input.surnameChar;
    deterministicRescueFired = true;
    usedFallbackSurname = isFallback;
    console.log("[naming-pipeline] deterministic rescue fired");
    const rescued = rescueDeterministic(
      surnameForRescue,
      ctx,
      1, // floor of 1 — never pad to 3; one clean name beats three padded junk names
      isFallback
    );
    verified = dedupe([...verified, ...rescued], ctx);
  }

  // ④ 评审先生打分排序(仅 >3 候选时启动 — ≤3 直接输出,无需评审裁剪)
  // 评审失败则优雅降级用校验顺序。
  onProgress(4, TOTAL, "The review master is judging…");
  let ordered = verified;
  if (verified.length > 3) {
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
            // 用评审点评覆盖,但保留 deterministic 救援的诚实标注(系统兜底姓/放宽性别)。
            if (r?.comment) {
              c.masterComment = c.rescueNote ? `${r.comment} ${c.rescueNote}` : r.comment;
            }
            return { c, i };
          })
          .sort((a, b) => sortKey(b.i) - sortKey(a.i))
          .map((x) => x.c);
      }
    } catch (e) {
      console.error("Critic failed, using verify order:", e instanceof Error ? e.message : e);
    }
  }

  // ⑤ 终选:优先取【来自不同诗】的名(防同一首诗出多个名,增强独属感);
  //    不足再从剩余按原排序补齐。ordered 已按 critic 分降序,故同诗取分最高者。
  const picked: ComposerCandidate[] = [];
  const usedLines = new Set<number>();
  for (const c of ordered) {
    if (picked.length >= 3) break;
    if (usedLines.has(c.lineId)) continue;
    usedLines.add(c.lineId);
    picked.push(c);
  }
  for (const c of ordered) {
    if (picked.length >= 3) break;
    if (!picked.includes(c)) picked.push(c);
  }

  // ⑥ 回填出处 + 五行/拼音 → NameOption(出处一律来自候选池,非 LLM 文本)
  onProgress(5, TOTAL, "Revealing your names…");
  const names = picked.map((c) => hydrate(c, pool));

  console.log(
    "[naming-pipeline]",
    JSON.stringify({
      round1Verified,
      composerCalls,
      deterministicRescueFired,
      finalCount: names.length,
      usedFallbackSurname,
    })
  );

  return { names, analysis };
}

function passing(
  candidates: ComposerCandidate[],
  ctx: VerifyContext
): ComposerCandidate[] {
  const passed = candidates.filter((c) => {
    if (!verifyCandidate(c, ctx).ok) return false;
    // Normalise charSpan to the minimal grounded span so that:
    //   • hydrate()'s indexOf bracing is anchored to the tightest window
    //     (fixes a latent double-brace bug when a given char repeats in the line), and
    //   • dedupe()'s charSpan.length quality tiebreaker reflects the real span.
    // verifyCandidate already confirmed deriveGroundedSpan returns non-null here.
    const line = ctx.pool.find((p) => p.chunkId === c.lineId);
    if (line) {
      const minimal = deriveGroundedSpan(line.chunkText, c.givenChars);
      if (minimal) c.charSpan = minimal;
    }
    return true;
  });
  return dedupe(passed, ctx);
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
    // 按【给定名】去重(非全名)。auto 选姓模式下,取名先生会给同一个名(如「明月」)
    // 配不同姓 → 全名不同但名相同,用户拿到的其实是"同一个名字"。按给定名去重可逼出
    // 3 个【真正不同】的名(不足则兜底补齐 floor-1)。specified 姓模式下姓相同,等价。
    const key = c.givenChars.join("");
    const prev = bestByKey.get(key);
    if (!prev || quality(c) > quality(prev)) bestByKey.set(key, c);
    if (!firstIndexByKey.has(key)) firstIndexByKey.set(key, i);
  });
  // ② 按 first-seen 顺序输出(保持原始排序稳定性)
  return [...bestByKey.entries()]
    .sort((a, b) => firstIndexByKey.get(a[0])! - firstIndexByKey.get(b[0])!)
    .map(([, c]) => c);
}

// rescueDeterministic 已抽到 ./rescue(纯模块:不引 API 客户端,便于零成本确定性单测;
// 见文件顶部 import)。它做分级放宽以保证 floor-1 —— 详见 rescue.ts。

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

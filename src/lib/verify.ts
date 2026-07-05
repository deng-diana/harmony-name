/**
 * 硬校验闸门 (verification gate) —— 命名管线的"事实"层,纯确定性代码。
 * =================================================================
 * 取名先生(LLM)只输出"引用第几条诗句 + 用了哪几个字",绝不写诗句原文。
 * 这里用代码核对这些"事实",不达标就丢弃 —— 把造假在结构上堵死:
 *   1. 出处真实:lineId 在候选池里 + charSpan 是该真句的连续子串 + 名字字都在其中
 *   2. 黑名单 / 性别禁用
 *   3. 五行:至少一个名字字属喜用神;不得含忌神字
 *   4. 音律(硬性):声调不全同;相邻字声母不相同(更细的叠韵/谐音交给评审先生)
 * 为什么是代码而非 LLM:让 LLM 判"字在不在句里",它自己也可能瞎说"在"。
 */
import type { ScoredPoem } from "./retriever";
import {
  elementOfChar,
  isNameSuitable,
  isForbiddenGivenName,
  isCelebrityName,
  isForbiddenNameSound,
  isHardBlacklisted,
  isFunctionWord,
  isSurnameBlacklisted,
  isGenderForbidden,
  isGenderClashing,
  pinyinOf,
} from "./namechars";

/**
 * Derive the shortest contiguous window of `chunkText` that covers all
 * `givenChars` (with multiplicity), tolerating function words between them
 * but rejecting any non-given, non-function-word content character.
 *
 * Returns null if:
 *   - a given char is absent from the text, or
 *   - the given chars can only co-occur across a content-char gap (no valid window).
 *
 * Algorithm: for each start position i where chunkText[i] is a given char,
 * walk forward; accept given chars and function words; abort on any content char.
 * Record the window when all given chars are covered. Return the shortest window.
 * Handles multiple occurrences of the same char — always picks the tightest valid window.
 */
export function deriveGroundedSpan(
  chunkText: string,
  givenChars: string[]
): string | null {
  if (givenChars.length === 0) return null;

  // Build a multiset of required chars (handle duplicates via count map).
  const required = new Map<string, number>();
  for (const ch of givenChars) {
    required.set(ch, (required.get(ch) ?? 0) + 1);
  }
  const givenSet = new Set(givenChars);

  let shortest: string | null = null;

  for (let i = 0; i < chunkText.length; i++) {
    // Only start a window from a given char.
    if (!givenSet.has(chunkText[i])) continue;

    // Copy the remaining-needed counts for this attempt.
    const remaining = new Map(required);
    let j = i;

    // Consume the starting char.
    const cnt0 = remaining.get(chunkText[i])!;
    if (cnt0 <= 1) remaining.delete(chunkText[i]);
    else remaining.set(chunkText[i], cnt0 - 1);

    // Walk forward until all given chars are covered or a content char stops us.
    let valid = true;
    while (remaining.size > 0) {
      if (j + 1 >= chunkText.length) {
        valid = false; // ran off the end without covering all required chars
        break;
      }
      j++;
      const ch = chunkText[j];
      if (givenSet.has(ch)) {
        // Given char: consume from remaining if still needed; otherwise just pass through.
        const cnt = remaining.get(ch);
        if (cnt !== undefined) {
          if (cnt <= 1) remaining.delete(ch);
          else remaining.set(ch, cnt - 1);
        }
      } else if (isFunctionWord(ch)) {
        // Function word (之/乎/兮/…): transparent gap — include in window, continue.
      } else {
        // Content char that is neither given nor a function word: this start fails.
        valid = false;
        break;
      }
    }

    if (valid && remaining.size === 0) {
      const win = chunkText.slice(i, j + 1);
      if (shortest === null || win.length < shortest.length) {
        shortest = win;
      }
    }
  }

  return shortest;
}

/** 取名先生输出的一个候选(只引用编号 + 字,不含诗句原文)。 */
export interface NameCandidate {
  lineId: number; // 引用候选池里某条真句的 chunkId
  charSpan: string; // 从该真句里取的【连续】片段(如 "清明")
  surnameChar: string; // 姓(单字;复姓场景后续再扩展)
  givenChars: string[]; // 名(1~2 字)
}

export interface VerifyContext {
  pool: ScoredPoem[];
  favourableElements: string[];
  avoidElements: string[];
  gender?: "male" | "female";
  /**
   * 兜底专用:为 true 时,把"软性别倾向"(masculineLean/feminineLean)从硬拦
   * 降级为放行 —— 仅 deterministic 救援的放宽 pass 用,以保证 always-3。
   * 硬性 genderForbidden(雄/霸/猛…)永远仍拦,不受此影响。
   */
  allowGenderLean?: boolean;
  /**
   * 生产层开启:正常只接受【双字给定名】(姓+2)。单字给定名(姓+1)整体质量塌方
   * (国学评审 2026-06-12:单字名意境断裂、显单薄),故只允许在确定性兜底
   * (orchestrate ③.6,不过此关)产出。默认 false(测试/兜底不受限)。
   */
  requireTwoGivenChars?: boolean;
  /**
   * 指定姓模式(用户选了姓):姓是【事实】不是审美,LLM 不得擅改。设了此值,
   * verifyCandidate 会硬校验 surnameChar === expectedSurname。auto 模式不设。
   */
  expectedSurname?: string;
}

export interface VerifyResult {
  ok: boolean;
  reasons: string[]; // 不通过原因(结构化文字,喂给评审先生做重生成反馈)
}

export function verifyCandidate(
  c: NameCandidate,
  ctx: VerifyContext
): VerifyResult {
  const reasons: string[] = [];

  // ① 出处真实性
  const line = ctx.pool.find((p) => p.chunkId === c.lineId);
  if (!line) {
    reasons.push(`lineId ${c.lineId} 不在候选池(疑似编造的出处)`);
  } else {
    // ①a Per-char presence: each given char must actually appear in the cited line.
    const missingChars = c.givenChars.filter((ch) => !line.chunkText.includes(ch));
    for (const ch of missingChars) {
      reasons.push(`「${ch}」未出现在所引诗句中`);
    }

    // ①b Derive the minimal grounded span — stop trusting the LLM's charSpan.
    // deriveGroundedSpan finds the shortest window covering all givenChars where
    // every character inside is either a given char or a function word (之/乎/兮/…).
    // A fabricated char yields no valid window → still rejected.
    // An over-wide LLM charSpan (e.g. "松月生夜凉" for given ["松","月"]) is now
    // corrected by the code: the minimal grounded span "松月" is accepted.
    if (missingChars.length === 0) {
      const groundedSpan = deriveGroundedSpan(line.chunkText, c.givenChars);
      if (groundedSpan === null) {
        reasons.push(
          `givenChars 在所引诗句中无紧邻通路(中夹了实字,不成词)`
        );
      } else if (c.givenChars.length >= 2) {
        // ①c Order check: givenChars must appear in the derived span in the SAME
        // relative order as declared in givenChars[]. A reversed pair (e.g. givenChars
        // ["珠","明"] but the line reads "明珠") is order-inverted — the resulting name
        // would harvest chars against their natural reading direction, producing
        // non-words like 珠明 (correct direction is 明珠). Pure deterministic check.
        const spanChars = [...groundedSpan];
        // Find the first position of each given char inside the derived span.
        const positions: number[] = [];
        const consumed = new Map<string, number>(); // track usage for duplicate chars
        for (const ch of c.givenChars) {
          const startSearch = consumed.get(ch) ?? 0;
          const pos = spanChars.findIndex(
            (sc, idx) => sc === ch && idx >= startSearch
          );
          positions.push(pos);
          consumed.set(ch, pos + 1);
        }
        // Verify positions are strictly increasing (same order as givenChars[]).
        const orderOk = positions.every(
          (p, i) => i === 0 || p > positions[i - 1]
        );
        if (!orderOk) {
          reasons.push(
            `给定字顺序与原诗句颠倒(「${c.givenChars.join("")}」在句中应为「${c.givenChars.slice().sort((a, b) => line.chunkText.indexOf(a) - line.chunkText.indexOf(b)).join("")}」顺序)`
          );
        }
      }
      // If non-null: a valid tight window exists — the span check passes.
      // The canonical charSpan will be normalised in the pipeline's passing() helper.
    }
  }

  // ② 黑名单 / 性别禁用
  // 姓:仅拦"绝对不可能是真姓"的字(inauspicious + crude:死/亡/魂/煞/屎/尿…)。
  //     王/何/莫/龙 等"虚词/僭越表"里的字仍放行,因为它们是真实存在的姓氏。
  //     auto 模式下,LLM 自选姓时此关防止它捡 魂/煞/屁 当姓 —— specified 模式下用户自选时
  //     若用户硬要"屎",活该被拦(几乎不可能发生)。
  if (isSurnameBlacklisted(c.surnameChar)) {
    reasons.push(`姓「${c.surnameChar}」不宜为姓氏(不吉/粗俗)`);
  }
  for (const ch of c.givenChars) {
    if (isHardBlacklisted(ch)) reasons.push(`「${ch}」入诗不入名(黑名单)`);
    if (ctx.gender && isGenderForbidden(ch, ctx.gender)) {
      reasons.push(`「${ch}」不适合${ctx.gender === "male" ? "男" : "女"}名`);
    }
    // 性别倾向硬拦截:仅拦【显式标注】明显冲突的字(女名忌 masculineLean,
    // 男名忌 feminineLean)。中性字(明/光/晴 等)不在此拦 —— 那是评审先生的审美活,
    // 此处只堵确定性的明显冲突,避免误杀。
    else if (ctx.gender && !ctx.allowGenderLean && isGenderClashing(ch, ctx.gender)) {
      reasons.push(`「${ch}」性别倾向明显与${ctx.gender === "male" ? "男" : "女"}名相冲`);
    }
  }

  // ②c 整名禁用:逐字可入名,但组合是节气/地名/老气花色/形容词(清明/桂花/江城/明智…)。
  if (isForbiddenGivenName(c.givenChars)) {
    reasons.push(`「${c.givenChars.join("")}」整体不宜作名(节气/地名/老气/形容词等)`);
  }

  // ②d 强制双字名(生产层):单字名(姓+1)质量塌方,正常只收双字名(姓+2);
  //     单字只在确定性兜底(③.6,不过此关)作为 always-3 的最后保险。
  if (ctx.requireTwoGivenChars && c.givenChars.length !== 2) {
    reasons.push(`需双字名(姓+2),当前给定 ${c.givenChars.length} 字`);
  }

  // ②e 叠字 / 给定字与姓同字:LLM 低概率产出,零成本可堵。
  //   叠字【刻意全拒】(产品定位"讲究"取名,叠字偏乳名;菲菲/婷婷等合法叠字也一并不出)——
  //   这是取舍而非纯防呆;双字名管线本就少出叠字,影响有限。同字(李李/李李x)纯坏名。
  if (new Set(c.givenChars).size !== c.givenChars.length) {
    reasons.push(`给定字叠字(${c.givenChars.join("")})`);
  }
  if (c.givenChars.includes(c.surnameChar)) {
    reasons.push(`给定字与姓同字(${c.surnameChar})`);
  }

  // ②f 指定姓模式:姓是事实,必须等于用户指定的姓(LLM 不得擅改/留空)。
  if (ctx.expectedSurname && c.surnameChar !== ctx.expectedSurname) {
    reasons.push(`姓「${c.surnameChar || "(空)"}」≠ 指定姓「${ctx.expectedSurname}」`);
  }

  // ②g 名人/历史人物撞名 + 全名谐音忌名 —— 取名"一票否决"项。
  if (isCelebrityName(c.surnameChar, c.givenChars)) {
    reasons.push(`全名「${c.surnameChar}${c.givenChars.join("")}」撞名人/历史人物`);
  }
  if (isForbiddenNameSound(c.surnameChar, c.givenChars)) {
    reasons.push(`全名谐音不雅`);
  }

  // ③ 名字适用性 + 五行
  const elems = c.givenChars.map(elementOfChar);
  // ③a 每个名字字必须"适合做名字"(在五行表 或 好名字表内)。否则取名先生会从诗句里
  //     抠出 床/裙/透/宙/鼎/簟 这类器物/物象/动词残片当字 —— 确定性校验(引用/五行/
  //     always-3)抓不到,但国学评审一致判为坏名(2026-06-12 验收)。好名字表含 月/风/星
  //     等不属五行但适合入名的字,故不会误杀 松月/明月 这类好名字。
  for (const ch of c.givenChars) {
    if (!isNameSuitable(ch)) {
      reasons.push(`「${ch}」非名字适用字(疑似从诗句抠出的器物/物象/动词字)`);
    }
  }
  // ③b 至少一个名字字属喜用神;不得含忌神字
  if (!elems.some((e) => e && ctx.favourableElements.includes(e))) {
    reasons.push(`无名字字属喜用神(${ctx.favourableElements.join("/") || "—"})`);
  }
  c.givenChars.forEach((ch, i) => {
    const e = elems[i];
    if (e && ctx.avoidElements.includes(e)) reasons.push(`「${ch}」属忌神(${e})`);
  });

  // ④ 音律(硬性,从严):仅拦【三字名全同调】这种明显呆板。
  // 相邻声母相同(双声,如 李莉/刘亮)其实常悦耳,且姓的声母改不了,故不硬拦,
  // 交评审先生做减分;更细的平仄/叠韵同理。两字名同调亦放行(周深/张飞)。
  const chars = [c.surnameChar, ...c.givenChars];
  const tones = chars.map((ch) => pinyinOf(ch).tone);
  const distinctTones = new Set(tones);
  if (tones.length >= 3 && distinctTones.size === 1 && !distinctTones.has(0)) {
    reasons.push(`声调全同(${tones.join("")}),读来呆板`);
  }

  return { ok: reasons.length === 0, reasons };
}

/** 批量校验,返回通过的候选。 */
export function verifyAll(
  candidates: NameCandidate[],
  ctx: VerifyContext
): { passed: NameCandidate[]; failed: { candidate: NameCandidate; reasons: string[] }[] } {
  const passed: NameCandidate[] = [];
  const failed: { candidate: NameCandidate; reasons: string[] }[] = [];
  for (const c of candidates) {
    const r = verifyCandidate(c, ctx);
    if (r.ok) passed.push(c);
    else failed.push({ candidate: c, reasons: r.reasons });
  }
  return { passed, failed };
}

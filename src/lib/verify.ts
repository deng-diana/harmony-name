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
  isHardBlacklisted,
  isFunctionWord,
  isGenderForbidden,
  isGenderClashing,
  pinyinOf,
} from "./namechars";

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
}

export interface VerifyResult {
  ok: boolean;
  reasons: string[]; // 不通过原因(结构化文字,喂给评审先生做重生成反馈)
}

// charSpan 应是名字字所在的"紧凑片段"(取名于一句之内连用数字),
// 不能拿整句长诗来"接地"。给名字字数 + 少量余量。
const MAX_SPAN_LEN = 8;

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
    if (!c.charSpan || !line.chunkText.includes(c.charSpan)) {
      reasons.push(`charSpan「${c.charSpan}」不是所引诗句的连续片段`);
    } else if (c.charSpan.length > MAX_SPAN_LEN) {
      reasons.push(`charSpan「${c.charSpan}」过长(应是名字字所在的紧凑片段,非整句)`);
    }
    for (const ch of c.givenChars) {
      if (!line.chunkText.includes(ch)) {
        reasons.push(`「${ch}」未出现在所引诗句中`);
      } else if (c.charSpan && !c.charSpan.includes(ch)) {
        reasons.push(`「${ch}」不在所标 charSpan 内`);
      }
    }
    // charSpan 内被"跳过"的字(非名字字)只能是【虚词】(之乎者也兮…),否则
    // 等于从"窈窕淑女"抠出"窈女"、把实字"窕淑"丢掉 —— 不允许跳过实字。
    // 注意:此处只放行 functionWords,绝不放行 inauspicious/overweening/crude ——
    // 否则 LLM 可从 "愁绪满怀" 抠出 "绪",把 "愁" 当作"可跳过"塞进引用框。
    if (c.charSpan && line.chunkText.includes(c.charSpan)) {
      for (const ch of c.charSpan) {
        if (!c.givenChars.includes(ch) && !isFunctionWord(ch)) {
          reasons.push(`charSpan 中夹了实字「${ch}」(只能跳过虚词)`);
        }
      }
    }
  }

  // ② 黑名单 / 性别禁用(仅查"名"字;姓不查黑名单 —— 王/何/莫 等都是常见姓氏,
  //    不能因它们在虚词/僭越表里就拒掉用户的真实姓氏)
  for (const ch of c.givenChars) {
    if (isHardBlacklisted(ch)) reasons.push(`「${ch}」入诗不入名(黑名单)`);
    if (ctx.gender && isGenderForbidden(ch, ctx.gender)) {
      reasons.push(`「${ch}」不适合${ctx.gender === "male" ? "男" : "女"}名`);
    }
    // 性别倾向硬拦截:仅拦【显式标注】明显冲突的字(女名忌 masculineLean,
    // 男名忌 feminineLean)。中性字(明/光/晴 等)不在此拦 —— 那是评审先生的审美活,
    // 此处只堵确定性的明显冲突,避免误杀。
    else if (ctx.gender && isGenderClashing(ch, ctx.gender)) {
      reasons.push(`「${ch}」性别倾向明显与${ctx.gender === "male" ? "男" : "女"}名相冲`);
    }
  }

  // ③ 五行:至少一个名字字属喜用神;不得含忌神字
  const elems = c.givenChars.map(elementOfChar);
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

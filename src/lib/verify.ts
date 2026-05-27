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
import { pinyin } from "pinyin-pro";
import type { ScoredPoem } from "./retriever";
import {
  elementOfChar,
  isHardBlacklisted,
  isGenderForbidden,
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

const initialOf = (c: string): string =>
  (pinyin(c, { pattern: "initial", type: "string" }) as string) || "";

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
    }
    for (const ch of c.givenChars) {
      if (!line.chunkText.includes(ch)) {
        reasons.push(`「${ch}」未出现在所引诗句中`);
      } else if (c.charSpan && !c.charSpan.includes(ch)) {
        reasons.push(`「${ch}」不在所标 charSpan 内`);
      }
    }
  }

  // ② 黑名单 / 性别禁用
  for (const ch of c.givenChars) {
    if (isHardBlacklisted(ch)) reasons.push(`「${ch}」入诗不入名(黑名单)`);
    if (ctx.gender && isGenderForbidden(ch, ctx.gender)) {
      reasons.push(`「${ch}」不适合${ctx.gender === "male" ? "男" : "女"}名`);
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

  // ④ 音律(硬性):全同调 / 相邻声母相同
  const chars = [c.surnameChar, ...c.givenChars];
  const tones = chars.map((ch) => pinyinOf(ch).tone);
  if (tones.length >= 2 && new Set(tones).size === 1) {
    reasons.push(`声调全同(${tones.join("")}),读来呆板`);
  }
  for (let i = 1; i < chars.length; i++) {
    const a = initialOf(chars[i - 1]);
    const b = initialOf(chars[i]);
    if (a && b && a === b) {
      reasons.push(`「${chars[i - 1]}${chars[i]}」声母相同(${a}-),拗口`);
    }
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

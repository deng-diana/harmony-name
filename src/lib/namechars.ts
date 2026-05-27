/**
 * 字库 (candidate-character library) —— 命名管线的"字"层。
 * =========================================================
 * 数据在 src/data/name-chars.json(五行→候选字)+ name-blacklist.json。
 * 五行分类规则见 name-chars.json 的 _rule(字义优先、部首其次)。
 *
 * 职责:
 *   - 喜用神(五行) × 性别 → 可入名的候选字(供按字检索 + 取名)
 *   - 反查某字的五行(给 anatomy 标五行,取代 LLM 瞎猜)
 *   - 黑名单判定(硬黑名单 / 性别禁用)
 *   - 拼音/声调(用 pinyin-pro,避免手输)
 */
import nameCharsData from "../data/name-chars.json";
import blacklistData from "../data/name-blacklist.json";
import { pinyin } from "pinyin-pro";

export type ElementEN = "Wood" | "Fire" | "Earth" | "Metal" | "Water";
export const ELEMENT_KEYS: ElementEN[] = [
  "Wood",
  "Fire",
  "Earth",
  "Metal",
  "Water",
];

// 五行 → 候选字
const elementChars = {} as Record<ElementEN, string[]>;
// 字 → 五行(反查)
const charToElement = new Map<string, ElementEN>();
for (const el of ELEMENT_KEYS) {
  const chars = ((nameCharsData as Record<string, unknown>)[el] as string[]) ?? [];
  elementChars[el] = chars;
  for (const c of chars) if (!charToElement.has(c)) charToElement.set(c, el);
}

// 黑名单
const hard = (blacklistData as { hard: Record<string, string[]> }).hard;
const HARD_SET = new Set<string>([
  ...hard.functionWords,
  ...hard.inauspicious,
  ...hard.overweening,
  ...hard.crude,
]);
const genderForbidden = (
  blacklistData as { genderForbidden: { male: string[]; female: string[] } }
).genderForbidden;
const MALE_FORBIDDEN = new Set(genderForbidden.male);
const FEMALE_FORBIDDEN = new Set(genderForbidden.female);

export function elementOfChar(c: string): ElementEN | undefined {
  return charToElement.get(c);
}

export function isHardBlacklisted(c: string): boolean {
  return HARD_SET.has(c);
}

export function isGenderForbidden(c: string, gender: "male" | "female"): boolean {
  return gender === "male" ? MALE_FORBIDDEN.has(c) : FEMALE_FORBIDDEN.has(c);
}

/** 该字是否可用于该性别的名字(非硬黑名单、非该性别禁用)。 */
export function isUsableInName(c: string, gender?: "male" | "female"): boolean {
  if (isHardBlacklisted(c)) return false;
  if (gender && isGenderForbidden(c, gender)) return false;
  return true;
}

/** 喜用神(若干五行) × 性别 → 去重后的候选字。 */
export function candidateCharsFor(
  elements: string[],
  gender?: "male" | "female"
): string[] {
  const out: string[] = [];
  for (const el of elements) {
    for (const c of elementChars[el as ElementEN] ?? []) {
      if (isUsableInName(c, gender)) out.push(c);
    }
  }
  return [...new Set(out)];
}

export function charsOfElement(el: ElementEN): string[] {
  return elementChars[el] ?? [];
}

/** 拼音 + 声调(1~4,轻声 0)。多音字取常用读音。 */
export function pinyinOf(c: string): { pinyin: string; tone: number } {
  const toned = pinyin(c, { toneType: "symbol", type: "string" }) as string;
  const num = pinyin(c, { toneType: "num", type: "string" }) as string;
  const m = num.match(/(\d)\s*$/);
  return { pinyin: toned, tone: m ? Number(m[1]) : 0 };
}

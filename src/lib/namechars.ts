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

// 性别倾向(positive signal,见 name-chars.json _genderLean)。两表互斥;
// 未列入者为中性。女名排除 masculineLean、男名排除 feminineLean,其余按
// 同性别 > 中性 排序 —— 给取名先生一个真正"偏向"的候选字池,而非仅靠硬黑名单。
const MASCULINE_LEAN = new Set<string>(
  ((nameCharsData as Record<string, unknown>).masculineLean as string[]) ?? []
);
const FEMININE_LEAN = new Set<string>(
  ((nameCharsData as Record<string, unknown>).feminineLean as string[]) ?? []
);

/** 该字的性别倾向(显式列表;未列入者为 neutral)。 */
export function genderLeanOf(c: string): "masculine" | "feminine" | "neutral" {
  if (MASCULINE_LEAN.has(c)) return "masculine";
  if (FEMININE_LEAN.has(c)) return "feminine";
  return "neutral";
}

/**
 * 该字是否明显与目标性别冲突(用于 candidateCharsFor 排除 + verify 软提示)。
 * 女名忌 masculineLean,男名忌 feminineLean。中性字不冲突。
 */
export function isGenderClashing(c: string, gender: "male" | "female"): boolean {
  return gender === "male" ? FEMININE_LEAN.has(c) : MASCULINE_LEAN.has(c);
}

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

/**
 * 喜用神(若干五行) × 性别 → 去重后的候选字,【按性别正向偏置】。
 *
 * 仅靠硬黑名单(genderForbidden)不足以避免中性/偏阳字流入女名(如 明/光/晴),
 * 故这里:① 排除明显冲突性别倾向的字(女名去 masculineLean,男名去 feminineLean);
 *        ② 把同性别倾向字排在中性字之前 —— 取名先生优先取列表靠前的字。
 * 不传 gender 时退化为原行为(全量、不排序)。
 */
export function candidateCharsFor(
  elements: string[],
  gender?: "male" | "female"
): string[] {
  const preferred: string[] = []; // 同性别倾向字(女→feminineLean,男→masculineLean)
  const neutral: string[] = []; // 中性字(两表都不在)
  const seen = new Set<string>();
  for (const el of elements) {
    for (const c of elementChars[el as ElementEN] ?? []) {
      if (seen.has(c)) continue;
      if (!isUsableInName(c, gender)) continue;
      if (gender && isGenderClashing(c, gender)) continue; // 排除明显冲突倾向
      seen.add(c);
      const lean = genderLeanOf(c);
      const sameLean =
        (gender === "female" && lean === "feminine") ||
        (gender === "male" && lean === "masculine");
      if (sameLean) preferred.push(c);
      else neutral.push(c);
    }
  }
  return [...preferred, ...neutral];
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

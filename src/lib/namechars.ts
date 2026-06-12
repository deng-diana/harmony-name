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
const FUNCTION_WORD_SET = new Set<string>(hard.functionWords);
const HARD_SET = new Set<string>([
  ...hard.functionWords,
  ...hard.inauspicious,
  ...hard.overweening,
  ...hard.crude,
]);
// 姓氏专用黑名单:inauspicious + crude(死/亡/魂/煞/屎/尿 …)—— 永远不可能是真姓氏。
// 不收 functionWords / overweening:王/何/莫/龙/帝 等里有真实姓氏(王是中国第一大姓),
// 拒掉这些会误伤用户的真实姓。auto 模式下 LLM 自选姓时,此白名单防止它捡 魂/煞。
const SURNAME_HARD_SET = new Set<string>([
  ...hard.inauspicious,
  ...hard.crude,
]);
const genderForbidden = (
  blacklistData as { genderForbidden: { male: string[]; female: string[] } }
).genderForbidden;
const MALE_FORBIDDEN = new Set(genderForbidden.male);
const FEMALE_FORBIDDEN = new Set(genderForbidden.female);

// 整名禁用表:逐字都可入名,但组合是节气/地名/老气花色/形容词(清明/桂花/江城…),作名不佳。
const FORBIDDEN_GIVEN_NAMES = new Set<string>(
  ((blacklistData as Record<string, unknown>).forbiddenGivenNames as string[]) ?? []
);

/** 给定名(给定字拼起来)是否整体禁用(节气/地名/老气/形容词等)。 */
export function isForbiddenGivenName(givenChars: string[]): boolean {
  return FORBIDDEN_GIVEN_NAMES.has(givenChars.join(""));
}

// 性别倾向(positive signal,见 name-chars.json _genderLean)。两表互斥;
// 未列入者为中性。女名排除 masculineLean、男名排除 feminineLean,其余按
// 同性别 > 中性 排序 —— 给取名先生一个真正"偏向"的候选字池,而非仅靠硬黑名单。
const MASCULINE_LEAN = new Set<string>(
  ((nameCharsData as Record<string, unknown>).masculineLean as string[]) ?? []
);
const FEMININE_LEAN = new Set<string>(
  ((nameCharsData as Record<string, unknown>).feminineLean as string[]) ?? []
);

// "好名字表":适合做名字、但【不承载五行】的字(月/风/星/影/思…)。与五行表一起
// 构成"名字适用字"全集。verify 用它挡掉 床/裙/透/宙 这类器物/动词字,同时不误杀
// 月/松月 这类不属五行的好字(五行表只按金木水火土收字,本就漏掉这类)。
const NEUTRAL_NAME_SET = new Set<string>(
  ((nameCharsData as Record<string, unknown>)._neutralNameChars as string[]) ?? []
);

/** 该字是否"适合做名字"(在五行表 或 好名字表内)。给定字都须通过此关。 */
export function isNameSuitable(c: string): boolean {
  return charToElement.has(c) || NEUTRAL_NAME_SET.has(c);
}

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

// 字库外常用字的五行兜底(字义优先、部首其次)。
// 用途:① 让 anatomy 不再出现空白五行(如"台/颜");② 让 verify 的忌神检查
// 不再漏判字库外的字。仅收【无争议的常用字】;月/思/文/影/颜 等流派分歧大故不收。
// 注意:仅影响"识别已选字的五行 + 校验",不进入候选字库(不会扩大取名先生的可选字)。
const EXTRA_ELEMENTS: Record<string, ElementEN> = {
  // Water — 雨/冫 部 或 字义水/黑
  雨: "Water", 霭: "Water", 霞: "Water", 霓: "Water", 汀: "Water", 玄: "Water",
  // Wood — 木/艹/竹 部 或 字义草木/风
  // 注:`若` 在黑名单 functionWords(虚词"假设/如同"),故不收 —— 避免与黑名单互冲。
  梧: "Wood", 梅: "Wood", 桑: "Wood", 杉: "Wood", 杏: "Wood",
  柳: "Wood", 槐: "Wood", 椿: "Wood", 桥: "Wood", 棣: "Wood",
  华: "Wood", 嘉: "Wood", 颖: "Wood",
  芃: "Wood", 苡: "Wood", 风: "Wood",
  // Fire — 火/灬/日 部 或 字义光/赤
  // 注:`紫` 流派分歧(红+蓝,有归火/金/水多说),故不收。
  炯: "Fire", 焜: "Fire", 曙: "Fire", 暻: "Fire", 晤: "Fire",
  // Earth — 土/山/宀/田/石/玉/王 部 或 字义建筑/玉石
  台: "Earth", 屋: "Earth", 璧: "Earth", 玉: "Earth", 玮: "Earth",
  峦: "Earth", 嵋: "Earth", 砚: "Earth",
  // Metal — 钅 部 或 字义白/秋/玉饰
  钫: "Metal", 鋆: "Metal",
};

export function elementOfChar(c: string): ElementEN | undefined {
  // 主字库优先;字库外查兜底表(部首/字义);都没有再返回 undefined。
  return charToElement.get(c) ?? EXTRA_ELEMENTS[c];
}

export function isHardBlacklisted(c: string): boolean {
  return HARD_SET.has(c);
}

/** 是否为虚词(之乎者也兮…) —— charSpan 跳字白名单专用,严格于 isHardBlacklisted。 */
export function isFunctionWord(c: string): boolean {
  return FUNCTION_WORD_SET.has(c);
}

/**
 * 姓氏专用硬黑名单:仅拦 inauspicious + crude(永远不可能是真姓氏)。
 * 王/何/莫/龙 等"看似负面但实为真姓"的字不在此列 —— 不会误伤用户的真实姓。
 * 仅在 auto 模式 LLM 自选姓时起作用。
 */
export function isSurnameBlacklisted(c: string): boolean {
  return SURNAME_HARD_SET.has(c);
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

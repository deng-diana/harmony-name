/**
 * 五行人际相性(Five-Element compatibility) —— 纯逻辑,无文案、无 React。
 *
 * 经传统八字大师 review 的双轴模型:
 *   轴一 relation:关系性质,纯生克推导(印/食伤/比劫/官杀/财 的"星"层,人人相同、永远正确)。
 *   轴二 energy:对"你"的能量损益,严格由本人喜忌(favourable/avoid)查表得出 —— 喜=lifts、
 *               忌=costs、皆不在=easy。比劫不走旺衰特殊逻辑,和其余四类一样查表(身强未必忌比劫,
 *               根子在喜忌不在旺衰;引擎已算好喜忌,查表反而更准)。
 *
 * 本模块只产出"事实",所有面向用户的英文文案(标签/一句话/免责声明)留在展示组件,便于单独调校口吻。
 */
import { RELATIONSHIPS } from "./bazi";
import type { Element } from "./elements";

/** 关系性质(轴一)。对应:印/食伤/比劫/官杀/财 —— 只到"星"层,不写具体十神(只有五行拿不到阴阳)。 */
export type Relation =
  | "nourisher" // 生我者·印星: X 生 E
  | "protege" // 我生者·食伤: E 生 X
  | "kindred" // 同族·比劫: X = E
  | "challenger" // 克我者·官杀: X 克 E
  | "cultivator"; // 我克者·财星: E 克 X

/** 能量损益(轴二),由喜忌查表得出。 */
export type Energy = "lifts" | "easy" | "costs";

export interface TribeCompat {
  element: Element;
  relation: Relation;
  energy: Energy;
  /** 在 favourableElements 中的序位(0 = 最养人);非喜用为 null。喜用神有主次,首位才是 best match。 */
  rank: number | null;
  isBestMatch: boolean; // rank === 0
}

export interface Compatibility {
  dayMaster: Element;
  /** 平衡局(忌神为空):UI 应整体降调,"合"与"耗"两侧都软化,不给强结论。 */
  isBalanced: boolean;
  /** 全部 5 族,已排好展示顺序:lifts(按 rank) → easy → costs。 */
  tribes: TribeCompat[];
  /** 最养人的那一族(favourableElements[0]);无喜用时 null。 */
  bestElement: Element | null;
  /** 最有张力/最费劲的那一族:有忌神取 avoid[0],平衡局取"克我者"(官杀)作温和的张力代表。 */
  foilElement: Element | null;
}

const ALL_ELEMENTS: Element[] = ["Wood", "Fire", "Earth", "Metal", "Water"];

const ENERGY_ORDER: Record<Energy, number> = { lifts: 0, easy: 1, costs: 2 };

function classifyRelation(dayMaster: Element, other: Element): Relation {
  if (other === dayMaster) return "kindred";
  const rel = RELATIONSHIPS[dayMaster];
  if (other === rel.generatedBy) return "nourisher"; // 生我
  if (other === rel.generate) return "protege"; // 我生
  if (other === rel.controlledBy) return "challenger"; // 克我
  if (other === rel.control) return "cultivator"; // 我克
  // 五行封闭,逻辑上不可达;兜底为 kindred 仅为类型完整。
  return "kindred";
}

export function computeCompatibility(input: {
  dayMaster: string;
  favourableElements: string[];
  avoidElements: string[];
}): Compatibility {
  const dayMaster = input.dayMaster as Element;
  // 守卫:非法 dayMaster 在此 fail-fast,而非深入 classifyRelation 后以晦涩 TypeError 炸出。
  if (!ALL_ELEMENTS.includes(dayMaster)) {
    throw new Error(`Invalid dayMaster: ${JSON.stringify(input.dayMaster)}`);
  }
  const favourable = input.favourableElements as Element[];
  const avoid = input.avoidElements as Element[];
  const isBalanced = avoid.length === 0;

  const tribes: TribeCompat[] = ALL_ELEMENTS.map((element) => {
    const favIndex = favourable.indexOf(element);
    const rank = favIndex >= 0 ? favIndex : null;
    let energy: Energy = "easy";
    if (favIndex >= 0) energy = "lifts";
    else if (avoid.includes(element)) energy = "costs";
    return {
      element,
      relation: classifyRelation(dayMaster, element),
      energy,
      rank,
      isBestMatch: favIndex === 0,
    };
  });

  // 展示顺序:lifts(按 rank 升序) → easy → costs。把"最养人"顶到最前。
  tribes.sort((a, b) => {
    if (a.energy !== b.energy) return ENERGY_ORDER[a.energy] - ENERGY_ORDER[b.energy];
    if (a.energy === "lifts") return (a.rank ?? 99) - (b.rank ?? 99);
    return 0;
  });

  const bestElement = (favourable[0] as Element) ?? null;
  const foilElement = isBalanced
    ? (RELATIONSHIPS[dayMaster].controlledBy as Element)
    : ((avoid[0] as Element) ?? null);

  return { dayMaster, isBalanced, tribes, bestElement, foilElement };
}

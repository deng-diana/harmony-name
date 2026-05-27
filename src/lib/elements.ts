/**
 * 五行的"可感"特质 —— 把抽象的 Wood/Fire/... 变成有颜色、方位、季节、情绪的身份元素。
 * 纯展示数据(客户端用),与命理计算解耦。配色取五行传统对应色。
 */
export type Element = "Wood" | "Fire" | "Earth" | "Metal" | "Water";

export interface ElementTrait {
  emoji: string; // 元素图标(用于"flow toward"标签)
  archetypeGlyph: string; // 身份大图标(分享卡主视觉)
  colorHex: string;
  colorName: string;
  direction: string;
  season: string;
  /** "流向"这个元素能给你什么 —— 用于社交化文案的一句意象。 */
  essence: string;
}

export const ELEMENTS: Record<Element, ElementTrait> = {
  Wood: {
    emoji: "🌳",
    archetypeGlyph: "🌲",
    colorHex: "#3F8F5B",
    colorName: "verdant green",
    direction: "East",
    season: "spring",
    essence: "growth, vision, and the ideas you nurture",
  },
  Fire: {
    emoji: "🔥",
    archetypeGlyph: "🔥",
    colorHex: "#D4503E",
    colorName: "crimson",
    direction: "South",
    season: "high summer",
    essence: "passion, warmth, and the people who light you up",
  },
  Earth: {
    emoji: "⛰️",
    archetypeGlyph: "⛰️",
    colorHex: "#C99A3B",
    colorName: "amber",
    direction: "Center",
    season: "late summer",
    essence: "ground, trust, and the things you build to last",
  },
  Metal: {
    emoji: "⚔️",
    archetypeGlyph: "⚔️",
    colorHex: "#8E97A3",
    colorName: "silver",
    direction: "West",
    season: "autumn",
    essence: "clarity, resolve, and a craft refined to its edge",
  },
  Water: {
    emoji: "🌊",
    archetypeGlyph: "🌊",
    colorHex: "#3B6FB5",
    colorName: "deep blue",
    direction: "North",
    season: "winter",
    essence: "wisdom, flow, and a quiet, unstoppable depth",
  },
};

/** 五行相生顺序(木→火→土→金→水→木),用于"古老循环"文化彩蛋。 */
export const GENERATING_CYCLE: Element[] = [
  "Wood",
  "Fire",
  "Earth",
  "Metal",
  "Water",
];

export function elementTrait(el: string): ElementTrait | undefined {
  return ELEMENTS[el as Element];
}

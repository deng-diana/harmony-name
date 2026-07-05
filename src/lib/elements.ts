/**
 * 五行的"可感"特质 —— 把抽象的 Wood/Fire/... 变成有颜色、方位、季节、情绪的身份元素。
 * 纯展示数据(客户端用),与命理计算解耦。配色取五行传统对应色。
 */
export type Element = "Wood" | "Fire" | "Earth" | "Metal" | "Water";

export interface ElementTrait {
  emoji: string; // element icon (for "flow toward" labels)
  archetypeGlyph: string; // identity hero glyph (share card visual)
  /** Traditional Chinese character for this element — 木/火/土/金/水.
   *  Rendered in brush font (font-brush) wherever emojis were used as
   *  display glyphs. */
  hanzi: string;
  colorHex: string;
  colorName: string;
  direction: string;
  season: string;
  /** What flowing toward this element gives you — used in social copy. */
  essence: string;
}

export const ELEMENTS: Record<Element, ElementTrait> = {
  Wood: {
    emoji: "🌳",
    archetypeGlyph: "🌲",
    hanzi: "木",
    colorHex: "#3F8F5B",
    colorName: "verdant green",
    direction: "East",
    season: "spring",
    essence: "growth, vision, and the ideas you nurture",
  },
  Fire: {
    emoji: "🔥",
    archetypeGlyph: "🔥",
    hanzi: "火",
    colorHex: "#D4503E",
    colorName: "crimson",
    direction: "South",
    season: "high summer",
    essence: "passion, warmth, and the people who light you up",
  },
  Earth: {
    emoji: "⛰️",
    archetypeGlyph: "⛰️",
    hanzi: "土",
    colorHex: "#C99A3B",
    colorName: "amber",
    direction: "Center",
    season: "late summer",
    essence: "ground, trust, and the things you build to last",
  },
  Metal: {
    emoji: "⚔️",
    archetypeGlyph: "⚔️",
    hanzi: "金",
    colorHex: "#8E97A3",
    colorName: "silver",
    direction: "West",
    season: "autumn",
    essence: "clarity, resolve, and a craft refined to its edge",
  },
  Water: {
    emoji: "🌊",
    archetypeGlyph: "🌊",
    hanzi: "水",
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

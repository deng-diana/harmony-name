import { describe, it, expect } from "vitest";
import { computeCompatibility, type TribeCompat } from "./compatibility";

const by = (tribes: TribeCompat[], el: string) =>
  tribes.find((t) => t.element === el)!;

describe("computeCompatibility — 轴一: 关系性质纯生克分类", () => {
  it("Wood 日主: 生我=Water(nourisher) 我生=Fire(protege) 同族=Wood(kindred) 克我=Metal(challenger) 我克=Earth(cultivator)", () => {
    const { tribes } = computeCompatibility({
      dayMaster: "Wood",
      favourableElements: [],
      avoidElements: [],
    });
    expect(by(tribes, "Water").relation).toBe("nourisher");
    expect(by(tribes, "Fire").relation).toBe("protege");
    expect(by(tribes, "Wood").relation).toBe("kindred");
    expect(by(tribes, "Metal").relation).toBe("challenger");
    expect(by(tribes, "Earth").relation).toBe("cultivator");
  });

  it("每个日主都恰好分出 5 类、且 5 类各出现一次", () => {
    for (const dm of ["Wood", "Fire", "Earth", "Metal", "Water"]) {
      const { tribes } = computeCompatibility({
        dayMaster: dm,
        favourableElements: [],
        avoidElements: [],
      });
      const relations = tribes.map((t) => t.relation).sort();
      expect(relations).toEqual(
        ["challenger", "cultivator", "kindred", "nourisher", "protege"].sort()
      );
    }
  });
});

describe("computeCompatibility — 轴二: 能量损益严格由喜忌查表", () => {
  it("身弱 Wood (喜 Water·Wood / 忌 Metal·Fire·Earth): 喜=lifts、忌=costs", () => {
    const { tribes } = computeCompatibility({
      dayMaster: "Wood",
      favourableElements: ["Water", "Wood"],
      avoidElements: ["Metal", "Fire", "Earth"],
    });
    expect(by(tribes, "Water").energy).toBe("lifts");
    expect(by(tribes, "Wood").energy).toBe("lifts");
    expect(by(tribes, "Metal").energy).toBe("costs");
    expect(by(tribes, "Fire").energy).toBe("costs");
    expect(by(tribes, "Earth").energy).toBe("costs");
  });

  it("喜用神有主次: 首位 isBestMatch、rank 递增", () => {
    const { tribes, bestElement } = computeCompatibility({
      dayMaster: "Wood",
      favourableElements: ["Water", "Wood"],
      avoidElements: ["Metal", "Fire", "Earth"],
    });
    expect(bestElement).toBe("Water");
    expect(by(tribes, "Water")).toMatchObject({ rank: 0, isBestMatch: true });
    expect(by(tribes, "Wood")).toMatchObject({ rank: 1, isBestMatch: false });
    expect(by(tribes, "Metal").rank).toBeNull();
  });

  it("比劫不走旺衰特殊逻辑: 身强同族落在忌神时 energy=costs(回归用例)", () => {
    // 身强 Wood: 喜 Metal·Fire·Earth, 忌 Water·Wood. 同族 Wood 在忌神 → costs(纯查表得出)。
    const { tribes } = computeCompatibility({
      dayMaster: "Wood",
      favourableElements: ["Metal", "Fire", "Earth"],
      avoidElements: ["Water", "Wood"],
    });
    const kindred = by(tribes, "Wood");
    expect(kindred.relation).toBe("kindred");
    expect(kindred.energy).toBe("costs");
    // 而身弱时同族在喜神 → lifts,证明全凭喜忌、与"是否比劫"无关。
    const weak = computeCompatibility({
      dayMaster: "Wood",
      favourableElements: ["Water", "Wood"],
      avoidElements: ["Metal", "Fire", "Earth"],
    });
    expect(by(weak.tribes, "Wood").energy).toBe("lifts");
  });
});

describe("computeCompatibility — Balanced 平衡局", () => {
  it("忌神为空: isBalanced=true、无任何 costs、foil 取克我者(官杀)", () => {
    // Balanced Wood: 喜 = [我生 Fire, 我克 Earth], 忌 = []。
    const c = computeCompatibility({
      dayMaster: "Wood",
      favourableElements: ["Fire", "Earth"],
      avoidElements: [],
    });
    expect(c.isBalanced).toBe(true);
    expect(c.tribes.some((t) => t.energy === "costs")).toBe(false);
    expect(c.foilElement).toBe("Metal"); // Metal 克 Wood
    expect(by(c.tribes, "Fire").energy).toBe("lifts");
    expect(by(c.tribes, "Earth").energy).toBe("lifts");
    expect(by(c.tribes, "Water").energy).toBe("easy");
  });
});

describe("computeCompatibility — 展示排序", () => {
  it("lifts(按 rank) → easy → costs", () => {
    const { tribes } = computeCompatibility({
      dayMaster: "Wood",
      favourableElements: ["Water", "Wood"],
      avoidElements: ["Metal", "Fire", "Earth"],
    });
    const energies = tribes.map((t) => t.energy);
    // 前两个是 lifts(Water 在 Wood 前,rank 0<1),其后是 costs(无 easy 档)
    expect(energies.slice(0, 2)).toEqual(["lifts", "lifts"]);
    expect(tribes[0].element).toBe("Water");
    expect(tribes[1].element).toBe("Wood");
    expect(energies.slice(2)).toEqual(["costs", "costs", "costs"]);
  });
});

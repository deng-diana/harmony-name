import { describe, it, expect } from "vitest";
import {
  ELEMENT_KEYS,
  elementOfChar,
  isHardBlacklisted,
  isGenderForbidden,
  isGenderClashing,
  genderLeanOf,
  isUsableInName,
  candidateCharsFor,
  charsOfElement,
  pinyinOf,
  type ElementEN,
} from "./namechars";
import truth from "../../fixtures/element-truth.json";

describe("字库 element classification", () => {
  it("matches the hand-labeled element-truth fixture", () => {
    for (const el of ELEMENT_KEYS) {
      for (const c of (truth as unknown as Record<string, string[]>)[el]) {
        expect(elementOfChar(c)).toBe(el);
      }
    }
  });

  it("no character is classified under two elements", () => {
    const seen = new Map<string, ElementEN>();
    for (const el of ELEMENT_KEYS) {
      for (const c of charsOfElement(el)) {
        expect(seen.has(c)).toBe(false); // would mean a duplicate across elements
        seen.set(c, el);
      }
    }
  });

  it("no 字库 character is on the HARD blacklist", () => {
    for (const el of ELEMENT_KEYS) {
      for (const c of charsOfElement(el)) {
        expect(isHardBlacklisted(c)).toBe(false);
      }
    }
  });
});

describe("字库 coverage (must not over-restrict naming)", () => {
  // Threshold lowered from 30 → 20 deliberately: candidateCharsFor now EXCLUDES
  // clearly opposite-gender-lean chars (positive gender bias). Earth/Fire/Metal are
  // intrinsically masculine/neutral, so the female pool per element shrinks — but
  // stays ≥20 usable, which is ample for the composer (it only needs a handful).
  it("each element offers ≥20 usable candidates for both genders", () => {
    for (const el of ELEMENT_KEYS) {
      expect(candidateCharsFor([el], "male").length).toBeGreaterThanOrEqual(20);
      expect(candidateCharsFor([el], "female").length).toBeGreaterThanOrEqual(20);
    }
  });
});

describe("gender lean classification", () => {
  it("tags masculine / feminine / neutral correctly", () => {
    expect(genderLeanOf("峰")).toBe("masculine");
    expect(genderLeanOf("浩")).toBe("masculine");
    expect(genderLeanOf("芷")).toBe("feminine");
    expect(genderLeanOf("瑶")).toBe("feminine");
    expect(genderLeanOf("清")).toBe("neutral"); // neutral-masculine, but not tagged → stays neutral
  });

  it("masculine and feminine lean sets are mutually exclusive", () => {
    for (const el of ELEMENT_KEYS) {
      for (const c of charsOfElement(el)) {
        const lean = genderLeanOf(c);
        if (lean === "masculine") expect(isGenderClashing(c, "female")).toBe(true);
        if (lean === "feminine") expect(isGenderClashing(c, "male")).toBe(true);
      }
    }
  });

  it("isGenderClashing: female rejects masculine-lean, male rejects feminine-lean", () => {
    expect(isGenderClashing("峰", "female")).toBe(true);
    expect(isGenderClashing("峰", "male")).toBe(false);
    expect(isGenderClashing("芷", "male")).toBe(true);
    expect(isGenderClashing("芷", "female")).toBe(false);
    expect(isGenderClashing("清", "female")).toBe(false); // neutral never clashes
  });
});

describe("candidateCharsFor gender bias", () => {
  it("excludes clearly masculine-lean chars from a female pool", () => {
    const fem = candidateCharsFor(["Fire", "Water"], "female");
    expect(fem).not.toContain("浩"); // masculine water
    expect(fem).not.toContain("景"); // masculine fire
    expect(fem).not.toContain("旭"); // masculine fire
  });

  it("excludes clearly feminine-lean chars from a male pool", () => {
    const male = candidateCharsFor(["Wood", "Metal"], "male");
    expect(male).not.toContain("蕊"); // feminine wood
    expect(male).not.toContain("瑶"); // feminine metal
  });

  it("orders same-gender-lean chars before neutral chars (positive bias)", () => {
    const fem = candidateCharsFor(["Water"], "female");
    const idxFeminine = fem.indexOf("漪"); // feminine-lean water
    const idxNeutral = fem.indexOf("清"); // neutral water
    expect(idxFeminine).toBeGreaterThanOrEqual(0);
    expect(idxNeutral).toBeGreaterThanOrEqual(0);
    expect(idxFeminine).toBeLessThan(idxNeutral);
  });

  it("still returns chars (no gender) without crashing", () => {
    expect(candidateCharsFor(["Wood"]).length).toBeGreaterThan(0);
  });
});

describe("blacklist", () => {
  it("blocks function words (入诗不入名)", () => {
    for (const c of ["之", "兮", "谁", "也", "其"]) {
      expect(isHardBlacklisted(c)).toBe(true);
      expect(isUsableInName(c)).toBe(false);
    }
  });
  it("enforces gender-forbidden sets", () => {
    expect(isGenderForbidden("霸", "female")).toBe(true);
    expect(isGenderForbidden("霸", "male")).toBe(false);
    expect(isGenderForbidden("娇", "male")).toBe(true);
  });
  it("candidateCharsFor excludes gender-forbidden chars", () => {
    expect(candidateCharsFor(["Metal"], "female")).not.toContain("钢");
    expect(candidateCharsFor(["Wood"], "male")).not.toContain("蕊");
  });
});

describe("pinyinOf", () => {
  it("returns the correct tone number", () => {
    expect(pinyinOf("泽").tone).toBe(2); // zé
    expect(pinyinOf("明").tone).toBe(2); // míng
    expect(pinyinOf("锐").tone).toBe(4); // ruì
    expect(pinyinOf("水").tone).toBe(3); // shuǐ
  });
});

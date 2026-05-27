import { describe, it, expect } from "vitest";
import {
  ELEMENT_KEYS,
  elementOfChar,
  isHardBlacklisted,
  isGenderForbidden,
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
  it("each element offers ≥30 usable candidates for both genders", () => {
    for (const el of ELEMENT_KEYS) {
      expect(candidateCharsFor([el], "male").length).toBeGreaterThanOrEqual(30);
      expect(candidateCharsFor([el], "female").length).toBeGreaterThanOrEqual(30);
    }
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

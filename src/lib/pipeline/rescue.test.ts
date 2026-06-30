import { describe, it, expect } from "vitest";
import { rescueDeterministic } from "./rescue";
import { verifyCandidate, type VerifyContext } from "../verify";
import type { ScoredPoem } from "../retriever";
import { elementOfChar, isGenderForbidden, genderLeanOf } from "../namechars";

const poem = (chunkId: number, chunkText: string): ScoredPoem => ({
  chunkId,
  chunkText,
  title: "T",
  author: "A",
  dynasty: "唐",
  source: "诗经",
  fullContent: chunkText,
  fameScore: 3,
  similarity: 0,
});

// 还原"难例":女命 + 喜用神 = 火/土,但池子里的火/土字大多偏阳。
//   昊/景(火,masculineLean) 峰/岳(土,masculineLean) —— 严格性别下会被拦
//   晴(火,中性) 容(土,feminineLean) —— 只有这 2 个能过严格关
// 严格兜底 → 只出 2 个(bug);分级放宽后火/土偏阳字可用 → 凑足 3。
const hardCtx: VerifyContext = {
  pool: [poem(1, "昊景晴"), poem(2, "峰岳容")],
  favourableElements: ["Fire", "Earth"],
  avoidElements: [],
  gender: "female",
};

describe("rescueDeterministic — always-3 invariant on hard female charts", () => {
  it("returns exactly 3 grounded names even when favourable chars skew masculine", () => {
    const out = rescueDeterministic("林", hardCtx, 3);
    expect(out.length).toBe(3);
  });

  it("every rescued given char is grounded in its cited pool line", () => {
    const out = rescueDeterministic("林", hardCtx, 3);
    for (const c of out) {
      const line = hardCtx.pool.find((p) => p.chunkId === c.lineId);
      expect(line).toBeDefined();
      for (const ch of c.givenChars) expect(line!.chunkText).toContain(ch);
    }
  });

  it("never emits a HARD gender-forbidden char (武/雄…) for a female", () => {
    const out = rescueDeterministic("林", hardCtx, 3);
    for (const c of out)
      for (const ch of c.givenChars)
        expect(isGenderForbidden(ch, "female")).toBe(false);
  });

  it("keeps element-correctness — every char carries a favourable element", () => {
    const out = rescueDeterministic("林", hardCtx, 3);
    for (const c of out)
      for (const ch of c.givenChars)
        expect(["Fire", "Earth"]).toContain(elementOfChar(ch));
  });

  it("chars are distinct and never equal the surname", () => {
    const out = rescueDeterministic("林", hardCtx, 3);
    const chars = out.flatMap((c) => c.givenChars);
    expect(new Set(chars).size).toBe(chars.length);
    expect(chars).not.toContain("林");
  });

  it("the relaxed pass actually fired (a soft-masculine favourable char was used)", () => {
    // strict supply is only 晴/容 (2); reaching 3 forces the relaxed pass to use a
    // masculineLean favourable char (昊/景/峰/岳) for the female chart.
    const chars = rescueDeterministic("林", hardCtx, 3).flatMap((c) => c.givenChars);
    expect(chars.some((ch) => genderLeanOf(ch) === "masculine")).toBe(true);
  });

  it("strict-only charts are unaffected — abundant feminine supply still yields 3", () => {
    const easyCtx: VerifyContext = {
      pool: [poem(10, "晴容彤"), poem(11, "暖映岚")], // all Fire/Earth feminine/neutral
      favourableElements: ["Fire", "Earth"],
      avoidElements: [],
      gender: "female",
    };
    expect(rescueDeterministic("林", easyCtx, 3).length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Floor-1 contract tests (needed = 1): the new minimum after the pipeline
// change that stops padding to 3.  These tests verify three properties the
// spec requires:
//   1. Returns ≥1 candidate and never 0 when there is at least one usable char.
//   2. Uses the SUPPLIED surname, never the 李 fallback.
//   3. Every returned candidate passes verifyCandidate (grounded).
// ---------------------------------------------------------------------------

const floorCtx: VerifyContext = {
  // 清 = Water (favourable), 昊 = Fire (favourable), both male-safe name-suitable chars.
  // Pool contains a real line so grounding check passes.
  pool: [poem(20, "清昊")],
  favourableElements: ["Water", "Fire"],
  avoidElements: ["Earth"],
  gender: "male",
};

describe("rescueDeterministic — floor-1 contract (needed = 1)", () => {
  it("returns ≥1 candidate and never 0 when the pool has usable chars", () => {
    const out = rescueDeterministic("邓", floorCtx, 1);
    expect(out.length).toBeGreaterThanOrEqual(1);
  });

  it("uses the SUPPLIED surname, not the 李 fallback", () => {
    const out = rescueDeterministic("邓", floorCtx, 1);
    expect(out.length).toBeGreaterThanOrEqual(1);
    for (const c of out) {
      expect(c.surnameChar).toBe("邓");
    }
  });

  it("every returned candidate passes verifyCandidate (grounded)", () => {
    // Use requireTwoGivenChars: false because rescue produces single-char given names.
    const rescueCtx: VerifyContext = { ...floorCtx, requireTwoGivenChars: false };
    const out = rescueDeterministic("邓", rescueCtx, 1);
    expect(out.length).toBeGreaterThanOrEqual(1);
    for (const c of out) {
      const result = verifyCandidate(c, rescueCtx);
      expect(result.ok).toBe(true);
    }
  });
});

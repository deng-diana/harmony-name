import { describe, it, expect } from "vitest";
import { verifyCandidate, type VerifyContext } from "./verify";
import type { ScoredPoem } from "./retriever";

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

const ctx = (over: Partial<VerifyContext> = {}): VerifyContext => ({
  pool: [
    poem(1, "维师尚父，时维鹰扬。凉彼武王，四伐大商，会朝清明。"),
    poem(6, "清培"),
    poem(7, "清兮"),
    poem(8, "江清"),
    poem(9, "甘露"),
  ],
  favourableElements: ["Water", "Fire"],
  avoidElements: ["Earth"],
  gender: "male",
  ...over,
});

describe("verifyCandidate", () => {
  it("passes a grounded, well-formed name (邓清明)", () => {
    const r = verifyCandidate(
      { lineId: 1, charSpan: "清明", surnameChar: "邓", givenChars: ["清", "明"] },
      ctx()
    );
    expect(r.ok).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("rejects a fabricated lineId (citation not in pool)", () => {
    const r = verifyCandidate(
      { lineId: 999, charSpan: "清明", surnameChar: "邓", givenChars: ["清", "明"] },
      ctx()
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/不在候选池/);
  });

  it("rejects a charSpan that is not in the cited line", () => {
    const r = verifyCandidate(
      { lineId: 1, charSpan: "春风", surnameChar: "邓", givenChars: ["春", "风"] },
      ctx()
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/连续片段|未出现/);
  });

  it("rejects a blacklist (入诗不入名) character", () => {
    const r = verifyCandidate(
      { lineId: 7, charSpan: "清兮", surnameChar: "周", givenChars: ["清", "兮"] },
      ctx()
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/黑名单/);
  });

  it("rejects a name carrying an avoid element (忌神)", () => {
    const r = verifyCandidate(
      { lineId: 6, charSpan: "清培", surnameChar: "周", givenChars: ["清", "培"] },
      ctx()
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/忌神/);
  });

  it("rejects an all-same-tone name (江清: 1+1)", () => {
    const r = verifyCandidate(
      { lineId: 8, charSpan: "清", surnameChar: "江", givenChars: ["清"] },
      ctx()
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/声调全同/);
  });

  it("rejects identical adjacent initials (林露: l-l)", () => {
    const r = verifyCandidate(
      { lineId: 9, charSpan: "露", surnameChar: "林", givenChars: ["露"] },
      ctx()
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/声母相同/);
  });

  it("rejects an over-long charSpan (whole long line, not a tight word)", () => {
    const r = verifyCandidate(
      {
        lineId: 1,
        charSpan: "维师尚父，时维鹰扬。凉彼武王，四伐大商，会朝清明。",
        surnameChar: "邓",
        givenChars: ["清", "明"],
      },
      ctx()
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/过长/);
  });

  it("rejects a masculine-coded char in a FEMALE name (郓明: 明 is masculine-lean)", () => {
    const r = verifyCandidate(
      { lineId: 1, charSpan: "清明", surnameChar: "郓", givenChars: ["清", "明"] },
      ctx({ gender: "female" })
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/性别倾向明显与女名相冲/);
  });

  it("does NOT reject the same masculine-coded char in a MALE name (郓明 ok for male)", () => {
    const r = verifyCandidate(
      { lineId: 1, charSpan: "清明", surnameChar: "郓", givenChars: ["清", "明"] },
      ctx({ gender: "male" }) // 明 is masculine-lean → fine for males
    );
    // 明 is Fire (favourable here), 清 Water (favourable); no clash for male
    expect(r.reasons.join()).not.toMatch(/性别倾向/);
  });

  it("does NOT reject a common surname that happens to be on the blacklist (王/何/莫)", () => {
    // 王 is in the overweening list as a GIVEN char, but it's the most common surname.
    const r = verifyCandidate(
      { lineId: 1, charSpan: "清明", surnameChar: "王", givenChars: ["清", "明"] },
      ctx()
    );
    expect(r.ok).toBe(true);
  });
});

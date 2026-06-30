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
    poem(6, "清岩"),
    poem(7, "清兮"),
    poem(8, "江清"),
    poem(9, "甘露"),
    poem(10, "江清溪"),
    poem(11, "清昊"),
  ],
  favourableElements: ["Water", "Fire"],
  avoidElements: ["Earth"],
  gender: "male",
  ...over,
});

describe("verifyCandidate", () => {
  it("passes a grounded, well-formed name (邓清昊)", () => {
    const r = verifyCandidate(
      { lineId: 11, charSpan: "清昊", surnameChar: "邓", givenChars: ["清", "昊"] },
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
      { lineId: 6, charSpan: "清岩", surnameChar: "周", givenChars: ["清", "岩"] },
      ctx()
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/忌神/);
  });

  it("rejects an all-same-tone 3-char name (江清溪: 1+1+1)", () => {
    const r = verifyCandidate(
      { lineId: 10, charSpan: "清溪", surnameChar: "江", givenChars: ["清", "溪"] },
      ctx()
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/声调全同/);
  });

  it("ALLOWS a 2-char same-tone name (江清: 1+1 — surname fixed, left to the critic)", () => {
    const r = verifyCandidate(
      { lineId: 8, charSpan: "清", surnameChar: "江", givenChars: ["清"] },
      ctx()
    );
    expect(r.reasons.join()).not.toMatch(/声调全同/);
  });

  it("ALLOWS identical adjacent initials now (双声 like 林露 left to the critic)", () => {
    // 露 is feminineLean(Water,favourable) → use female ctx so it's not a gender clash
    const r = verifyCandidate(
      { lineId: 9, charSpan: "露", surnameChar: "林", givenChars: ["露"] },
      ctx({ gender: "female" })
    );
    expect(r.reasons.join()).not.toMatch(/声母/);
    expect(r.ok).toBe(true);
  });

  it("auto-tightens an over-wide charSpan, then judges on real rules (清明 = solar term, not 'too long')", () => {
    // The LLM passed the whole clause as charSpan. The code now DERIVES the minimal
    // grounded span 清明 (the two given chars are adjacent in the line) and the name
    // is rejected for its REAL reason — 清明 is a solar term — not for span length.
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
    expect(r.reasons.join()).toMatch(/整体不宜作名/);
    expect(r.reasons.join()).not.toMatch(/过长/);
  });

  it("PASSES an over-wide charSpan when the given chars are a real tight word (清昊)", () => {
    // Core regression guard for the charSpan fix: the LLM over-extends the span to
    // the whole line, but 清昊 is a genuine adjacent pair → the derived minimal span
    // makes it pass instead of being rejected on the wedged-content-char rule.
    const r = verifyCandidate(
      { lineId: 20, charSpan: "清昊生晚晴", surnameChar: "邓", givenChars: ["清", "昊"] },
      ctx({ pool: [poem(20, "清昊生晚晴")] })
    );
    expect(r.ok).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("PASSES when a function word sits between the two given chars (清兮昊)", () => {
    const r = verifyCandidate(
      { lineId: 21, charSpan: "清兮昊", surnameChar: "邓", givenChars: ["清", "昊"] },
      ctx({ pool: [poem(21, "清兮昊")] })
    );
    expect(r.ok).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("REJECTS when a content char wedges between the given chars (no tight window) (清山昊)", () => {
    const r = verifyCandidate(
      { lineId: 22, charSpan: "清山昊", surnameChar: "邓", givenChars: ["清", "昊"] },
      ctx({ pool: [poem(22, "清山昊远")] })
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/无紧邻通路|中夹/);
  });

  it("picks the TIGHT pair when a given char repeats in the line (清风清昊 → 清昊)", () => {
    const r = verifyCandidate(
      { lineId: 23, charSpan: "清风清昊", surnameChar: "邓", givenChars: ["清", "昊"] },
      ctx({ pool: [poem(23, "清风清昊")] })
    );
    expect(r.ok).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("REJECTS a hallucinated given char not present in the line (曦 not in 清昊)", () => {
    const r = verifyCandidate(
      { lineId: 11, charSpan: "清曦", surnameChar: "邓", givenChars: ["清", "曦"] },
      ctx()
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/未出现/);
  });

  it("rejects a masculine-coded char in a FEMALE name (郓昊: 昊 is masculine-lean)", () => {
    const r = verifyCandidate(
      { lineId: 11, charSpan: "清昊", surnameChar: "郓", givenChars: ["清", "昊"] },
      ctx({ gender: "female" })
    );
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/性别倾向明显与女名相冲/);
  });

  it("does NOT reject the same masculine-coded char in a MALE name (郓昊 ok for male)", () => {
    const r = verifyCandidate(
      { lineId: 11, charSpan: "清昊", surnameChar: "郓", givenChars: ["清", "昊"] },
      ctx({ gender: "male" }) // 昊 is masculine-lean → fine for males
    );
    // 昊 is Fire (favourable here), 清 Water (favourable); no clash for male
    expect(r.reasons.join()).not.toMatch(/性别倾向/);
  });

  it("does NOT reject a common surname that happens to be on the blacklist (王/何/莫)", () => {
    // 王 is in the overweening list as a GIVEN char, but it's the most common surname.
    const r = verifyCandidate(
      { lineId: 11, charSpan: "清昊", surnameChar: "王", givenChars: ["清", "昊"] },
      ctx()
    );
    expect(r.ok).toBe(true);
  });
});

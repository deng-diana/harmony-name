import { describe, it, expect } from "vitest";
import { rescueDeterministic } from "./rescue";
import type { VerifyContext } from "../verify";
import type { ScoredPoem } from "../retriever";
import { elementOfChar, isGenderForbidden } from "../namechars";

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
//   旭/景(火,masculineLean) 峰/岳(土,masculineLean) —— 严格性别下会被拦
//   晴(火,中性) 容(土,feminineLean) —— 只有这 2 个能过严格关
// 严格兜底 → 只出 2 个(bug);分级放宽后火/土偏阳字可用 → 凑足 3。
const hardCtx: VerifyContext = {
  pool: [poem(1, "旭景晴"), poem(2, "峰岳容")],
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
    // 旭 is Fire + masculineLean; it can only appear if the relaxed pass ran.
    const chars = rescueDeterministic("林", hardCtx, 3).flatMap((c) => c.givenChars);
    expect(chars).toContain("旭");
  });

  it("strict-only charts are unaffected — abundant feminine supply still yields 3", () => {
    const easyCtx: VerifyContext = {
      pool: [poem(10, "晴容晗"), poem(11, "彤昕暖")], // all Fire/Earth feminine/neutral
      favourableElements: ["Fire", "Earth"],
      avoidElements: [],
      gender: "female",
    };
    expect(rescueDeterministic("林", easyCtx, 3).length).toBe(3);
  });
});

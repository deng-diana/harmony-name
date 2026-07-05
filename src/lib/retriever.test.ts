/**
 * Tests for the deterministic sentiment gate in retriever.ts.
 *
 * P1 funerary-title filter (expert audit 2026-07-05, poetry finding #2):
 * Funerary / mourning poems must not be naming sources regardless of how
 * bright an individual line looks. The gate is purely deterministic code —
 * the Critic cannot perform this check because it receives only the bare
 * line text (no title context).
 */
import { describe, it, expect } from "vitest";
import { isFuneraryPoemTitle } from "./retriever";

describe("isFuneraryPoemTitle — sentiment gate", () => {
  it("blocks the 楚辞 funerary canon by exact title", () => {
    expect(isFuneraryPoemTitle("招魂")).toBe(true);
    expect(isFuneraryPoemTitle("大招")).toBe(true);
    expect(isFuneraryPoemTitle("国殇")).toBe(true);
    expect(isFuneraryPoemTitle("哀郢")).toBe(true);
    expect(isFuneraryPoemTitle("怀沙")).toBe(true);   // 屈原's death poem
    expect(isFuneraryPoemTitle("悲回风")).toBe(true);
    expect(isFuneraryPoemTitle("哀时命")).toBe(true); // 庄忌
    expect(isFuneraryPoemTitle("九思")).toBe(true);
    expect(isFuneraryPoemTitle("七谏")).toBe(true);
    expect(isFuneraryPoemTitle("九怀")).toBe(true);
    expect(isFuneraryPoemTitle("九叹")).toBe(true);
  });

  it("blocks other well-known mourning texts by exact title", () => {
    expect(isFuneraryPoemTitle("祭十二郎文")).toBe(true);
    expect(isFuneraryPoemTitle("祭妹文")).toBe(true);
  });

  it("blocks mourning-pattern titles via regex (哀/悲/悼/挽/殇/哭/葬/墓)", () => {
    // Titles containing the mourning characters should be blocked.
    expect(isFuneraryPoemTitle("哀江头")).toBe(true);      // 杜甫
    expect(isFuneraryPoemTitle("悼亡诗")).toBe(true);      // generic mourning
    expect(isFuneraryPoemTitle("挽歌")).toBe(true);        // dirge
    expect(isFuneraryPoemTitle("悲秋")).toBe(true);
    expect(isFuneraryPoemTitle("伤逝")).toBe(true);
  });

  it("does NOT block legitimate naming-source poems", () => {
    // 楚辞 virtue passages — safe for naming.
    expect(isFuneraryPoemTitle("离骚")).toBe(false);
    expect(isFuneraryPoemTitle("九歌")).toBe(false);
    expect(isFuneraryPoemTitle("橘颂")).toBe(false);
    // Classical Tang/Song poems.
    expect(isFuneraryPoemTitle("静夜思")).toBe(false);
    expect(isFuneraryPoemTitle("春晓")).toBe(false);
    expect(isFuneraryPoemTitle("水调歌头")).toBe(false);
    expect(isFuneraryPoemTitle("山居秋暝")).toBe(false);
    expect(isFuneraryPoemTitle("关雎")).toBe(false);     // 诗经
    expect(isFuneraryPoemTitle("思齐")).toBe(false);     // 诗经 大雅
    // Names that contain blocked characters but are NOT mourning poems.
    // "悬" (hang) vs "悼" — check we don't over-block.
    expect(isFuneraryPoemTitle("宿业师山房期丁大不至")).toBe(false);
  });
});

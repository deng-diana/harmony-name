/**
 * Unit tests for runNamingPipeline (orchestrate.ts).
 *
 * External I/O modules are mocked; verifyCandidate and rescueDeterministic run
 * for real — this is intentional. The test candidates are hand-verified to pass
 * verifyCandidate (grounded lineId, Water/Fire favourable, male, no blacklist).
 *
 * Assertions target the three PR-1 invariants:
 *   1. When ≥1 candidate verifies on the first composer round → composer called
 *      exactly ONCE (no retry), critic NOT called.
 *   2. When ≤3 candidates pass → critic NOT called (skip-≤3 threshold).
 *   3. When the composer produces nothing usable → deterministic rescue fires,
 *      result has exactly 1 name, and the supplied surname is used (not 李).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock calls are hoisted before imports by Vitest — order here does not matter.
vi.mock("../agents/composer", () => ({
  runComposer: vi.fn(),
  createComposerSystemPrompt: vi.fn(() => ""),
  buildPoolBlock: vi.fn(() => ""),
  buildComposerUserMessage: vi.fn(() => ""),
}));
vi.mock("../agents/critic", () => ({
  runCritic: vi.fn(),
}));
vi.mock("../retriever", () => ({
  buildVerifiedPool: vi.fn(),
}));

import { runNamingPipeline, type PipelineInput } from "./orchestrate";
import { runComposer } from "../agents/composer";
import { runCritic } from "../agents/critic";
import { buildVerifiedPool } from "../retriever";
import type { ScoredPoem } from "../retriever";
import type { ComposerCandidate } from "../agents/composer";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const poem = (chunkId: number, chunkText: string): ScoredPoem => ({
  chunkId,
  chunkText,
  title: "TestTitle",
  author: "TestAuthor",
  dynasty: "唐",
  source: "诗经",
  fullContent: chunkText,
  fameScore: 3,
  similarity: 0.9,
});

// Pool covers all lineIds used in the test candidates below.
// 清 = Water, 昊 = Fire — both known good from verify.test.ts.
// 景 = Fire (masculine-lean, safe for male) — confirmed by rescue.test.ts pool.
const TEST_POOL: ScoredPoem[] = [
  poem(1, "清昊"), // referenced by CAND_1
  poem(2, "昊清"), // referenced by CAND_2 (reversed pair → distinct dedup key)
  poem(3, "清昊"), // referenced by CAND_3 with same chars as CAND_1 but different lineId
];

// CAND_1: 邓(4)+清(1)+昊(4) — tones not all same ✓  Water+Fire favourable ✓
const CAND_1: ComposerCandidate = {
  lineId: 1,
  charSpan: "清昊",
  surnameChar: "邓",
  givenChars: ["清", "昊"],
  meanings: { 清: "clear and pure", 昊: "vast sky" },
  poeticMeaning: "The clarity of water meeting the vastness of sky.",
  translation: "Clear vast sky",
  masterComment: "Balanced phonetics, Water + Fire complement.",
};

// CAND_2: 王(2)+昊(4)+清(1) — tones not all same ✓  Fire+Water favourable ✓
// givenChars key = "昊清" ≠ "清昊" → survives dedup alongside CAND_1.
const CAND_2: ComposerCandidate = {
  lineId: 2,
  charSpan: "昊清",
  surnameChar: "王",
  givenChars: ["昊", "清"],
  meanings: { 昊: "vast sky", 清: "clear and pure" },
  poeticMeaning: "Vast sky, clear heart.",
  translation: "Vast and clear",
  masterComment: "Inversion adds freshness.",
};

// CAND_3 uses the same char pair as CAND_1 but a different lineId (poem 3 also has "清昊").
// givenChars key = "清昊" — SAME as CAND_1 → dedupe will keep only one.
// In the 3-candidate test we need 3 distinct names; supply this only when needed
// alongside a truly distinct third candidate.  See the 3-name test below for how
// we avoid the dedup collision.
const CAND_3_DISTINCT: ComposerCandidate = {
  // lineId 1 again, different surname — but givenChars key "昊清" same as CAND_2!
  // Not used in 3-name test; declared only for reference.
  lineId: 1,
  charSpan: "清昊",
  surnameChar: "张",
  givenChars: ["清", "昊"],
  meanings: { 清: "clear", 昊: "sky" },
  poeticMeaning: "Clear sky.",
  translation: "Clear sky",
  masterComment: "Clean name.",
};
void CAND_3_DISTINCT; // suppress unused-variable lint

// For the 3-candidate test we need a genuinely distinct third candidate.
// Use only 清 as a single given char with requireTwoGivenChars=false?  No — the real
// ctx in orchestrate.ts has requireTwoGivenChars:true.  We need a 2-given-char name
// with a key different from "清昊" and "昊清".
//
// We achieve this by adding a 4th pool line: poem(4, "清昊景") so that charSpan "昊景"
// is a contiguous substring, and 景 = Fire (masculine-lean, male-safe).
// The TEST_POOL for 3-name tests therefore gets an extra line.
const TEST_POOL_3: ScoredPoem[] = [
  ...TEST_POOL,
  poem(4, "清昊景"), // CAND_3 references this
];

// CAND_3 (for 3-name test): 张(1)+昊(4)+景(3) — tones not all same ✓  Fire favourable ✓
// givenChars key = "昊景" — distinct from "清昊" and "昊清" ✓
const CAND_3: ComposerCandidate = {
  lineId: 4,
  charSpan: "昊景",
  surnameChar: "张",
  givenChars: ["昊", "景"],
  meanings: { 昊: "vast sky", 景: "bright scenery" },
  poeticMeaning: "Sky full of bright scenery.",
  translation: "Vast bright scenery",
  masterComment: "Strong masculine imagery.",
};

// ---------------------------------------------------------------------------
// Shared input (auto-surname mode — surnameChar not set)
// ---------------------------------------------------------------------------

const baseInput: PipelineInput = {
  gender: "male",
  dayMaster: "Water",
  strength: "Weak",
  favourableElements: ["Water", "Fire"],
  avoidElements: ["Earth"],
  recommendedNameLength: "3 characters (Surname + 2 Names)",
  surnameInstruction:
    "RECOMMEND a DIFFERENT, varied surname for each candidate — each harmonizing with the Water Day Master.",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: critic is safe to call (won't throw) but we assert it's not called.
  vi.mocked(runCritic).mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// Suite 1: composer called once when ≥1 candidate verifies on round 1
// ---------------------------------------------------------------------------

describe("runNamingPipeline — no retry when ≥1 verified on first round", () => {
  it("returns 2 names, calls composer ONCE, and skips the critic when 2 candidates verify", async () => {
    vi.mocked(buildVerifiedPool).mockResolvedValue(TEST_POOL);
    vi.mocked(runComposer).mockResolvedValue({
      analysis: "Weak Water chart — favour Water and Fire.",
      candidates: [CAND_1, CAND_2],
    });

    const result = await runNamingPipeline(baseInput);

    expect(result.names).toHaveLength(2);
    expect(vi.mocked(runComposer)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(runCritic)).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 2: critic skip-≤3 threshold
// ---------------------------------------------------------------------------

describe("runNamingPipeline — critic not called for ≤3 verified candidates", () => {
  it("does NOT call the critic when exactly 3 candidates verify", async () => {
    vi.mocked(buildVerifiedPool).mockResolvedValue(TEST_POOL_3);
    vi.mocked(runComposer).mockResolvedValue({
      analysis: "Three solid names found.",
      candidates: [CAND_1, CAND_2, CAND_3],
    });

    const result = await runNamingPipeline(baseInput);

    expect(result.names).toHaveLength(3);
    expect(vi.mocked(runCritic)).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 3: deterministic rescue when composer produces nothing usable
// ---------------------------------------------------------------------------

describe("runNamingPipeline — deterministic rescue on zero verified", () => {
  it("fires rescue, returns exactly 1 name, and uses the supplied surname (not 李)", async () => {
    // Pool contains 清 (Water, favourable, name-suitable, male-safe) so rescue finds ≥1 char.
    vi.mocked(buildVerifiedPool).mockResolvedValue([poem(1, "清昊")]);
    // Both rounds (initial + retry) produce nothing.
    vi.mocked(runComposer).mockResolvedValue({ analysis: "", candidates: [] });

    const result = await runNamingPipeline({
      ...baseInput,
      surnameChar: "邓", // supplied → rescue MUST use 邓, not 李
    });

    expect(result.names).toHaveLength(1);
    // The one rescued name must carry the supplied surname.
    expect(result.names[0].hanzi.startsWith("邓")).toBe(true);
    // Rescue only produces 1 candidate; 1 is not > 3, so the critic must be skipped.
    expect(vi.mocked(runCritic)).not.toHaveBeenCalled();
  });
});

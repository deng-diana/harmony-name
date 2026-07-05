/**
 * Deterministic fallback — no LLM, pure code scans the pool for
 * name-suitable chars grounded in real lines.
 *
 * Tier order (always-3 guarantee):
 *   A) Two-char given names from the pool (preferred — 2024 registry data
 *      shows double given names outnumber singles 25:1; a bare 姓+1 rescue
 *      name reads anomalous). Pairs two chars from the SAME pool line where:
 *      - at least one carries a favourable element
 *      - both are name-suitable and pass gender checks
 *      - together they form a valid 2-given-char candidate per verifyCandidate
 *   B) Single-char given names (fallback when A exhausts the pool).
 *      Annotated honestly in masterComment.
 *
 * Grade relaxation across both tiers (hardest invariants never relax):
 *   Pass ①: favourable element + gender-lean OK
 *   Pass ②: favourable element + gender-lean relaxed (allowGenderLean)
 *   Pass ③: non-avoid element + gender-lean relaxed (pathological fallback)
 *
 * Two-char pairing logic (expert audit 2026-07-05, naming finding #2):
 *   Scan each pool line for pairs of distinct name-suitable chars where at
 *   least one carries a favourable element and neither carries an avoid
 *   element. The pair must appear as adjacent chars (or separated by a
 *   single function word) so the resulting name is grounded. We pass the
 *   pair through verifyCandidate to enforce all remaining hard rules.
 */
import { deriveGroundedSpan, verifyCandidate, type VerifyContext } from "../verify";
import {
  elementOfChar,
  isGenderForbidden,
  isHardBlacklisted,
  isNameSuitable,
  isFunctionWord,
} from "../namechars";
import type { ComposerCandidate } from "../agents/composer";

// ---------------------------------------------------------------------------
// Two-char combination helpers
// ---------------------------------------------------------------------------

/**
 * Scan a single pool line for valid 2-char given-name pairs.
 * A pair (a, b) is valid when:
 *   - Both chars appear in the line with at most one function word between them
 *     (same "tight window" rule as deriveGroundedSpan)
 *   - At least one of {a, b} carries a favourable element, neither carries an avoid
 *   - Neither is hard-blacklisted or gender-forbidden
 *   - Both are name-suitable
 *   - a ≠ b and neither equals the surname
 */
function twoCharPairsFromLine(
  lineText: string,
  surnameChar: string,
  ctx: VerifyContext,
  elementFilter: (el: string | undefined, el2: string | undefined) => boolean
): Array<[string, string, string]> { // [char1, char2, groundedSpan]
  const pairs: Array<[string, string, string]> = [];
  const chars = [...lineText];

  for (let i = 0; i < chars.length; i++) {
    const a = chars[i];
    if (!isNameSuitable(a)) continue;
    if (isHardBlacklisted(a)) continue;
    if (ctx.gender && isGenderForbidden(a, ctx.gender)) continue;
    if (a === surnameChar) continue;

    // Try adjacent (j = i+1) and function-word-gapped (j = i+2 when chars[i+1] is a function word).
    const jCandidates: number[] = [];
    if (i + 1 < chars.length) jCandidates.push(i + 1);
    if (i + 2 < chars.length && isFunctionWord(chars[i + 1])) jCandidates.push(i + 2);

    for (const j of jCandidates) {
      const b = chars[j];
      if (!isNameSuitable(b)) continue;
      if (isHardBlacklisted(b)) continue;
      if (ctx.gender && isGenderForbidden(b, ctx.gender)) continue;
      if (b === surnameChar) continue;
      if (b === a) continue; // no repeated chars

      const elA = elementOfChar(a);
      const elB = elementOfChar(b);
      if (!elementFilter(elA, elB)) continue;

      // Verify using the tight-window derivation so we get a real span.
      const span = deriveGroundedSpan(lineText, [a, b]);
      if (!span) continue;

      pairs.push([a, b, span]);
    }
  }
  return pairs;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function rescueDeterministic(
  surnameChar: string,
  ctx: VerifyContext,
  needed: number,
  isFallbackSurname = false
): ComposerCandidate[] {
  if (needed <= 0 || !surnameChar) return [];
  const out: ComposerCandidate[] = [];
  // usedChars tracks ALL individual characters used in any candidate's givenChars
  // so that no single character is repeated across candidates (invariant required by
  // tests and name-quality: overlapping chars would make names feel non-distinct).
  const usedChars = new Set<string>();
  const fallbackNote = isFallbackSurname
    ? " (System-assigned surname; the AI did not converge on a candidate this round.)"
    : "";
  const relaxedNote =
    " (Element-led fallback — the most fitting grounded characters for this rare chart lean slightly yang.)";

  // Base ctx: turn off requireTwoGivenChars so this module can produce both
  // 2-char (tier A) and 1-char (tier B) given names without verify blocking them.
  const base: VerifyContext = { ...ctx, requireTwoGivenChars: false };

  // -------------------------------------------------------------------------
  // Tier A — Two-char given names (preferred)
  // -------------------------------------------------------------------------
  // Three passes matching the single-char relaxation ladder.
  const twoCharPasses: Array<{
    vctx: VerifyContext;
    elementFilter: (a: string | undefined, b: string | undefined) => boolean;
    relaxed: boolean;
  }> = [
    // ① Both chars validated: ≥1 favourable, no avoid, soft gender ok.
    {
      vctx: base,
      elementFilter: (a, b) => {
        const hasFav =
          (!!a && ctx.favourableElements.includes(a)) ||
          (!!b && ctx.favourableElements.includes(b));
        const noAvoid =
          !(a && ctx.avoidElements.includes(a)) &&
          !(b && ctx.avoidElements.includes(b));
        return hasFav && noAvoid;
      },
      relaxed: false,
    },
    // ② Same element filter, but allowGenderLean relaxed.
    {
      vctx: { ...base, allowGenderLean: true },
      elementFilter: (a, b) => {
        const hasFav =
          (!!a && ctx.favourableElements.includes(a)) ||
          (!!b && ctx.favourableElements.includes(b));
        const noAvoid =
          !(a && ctx.avoidElements.includes(a)) &&
          !(b && ctx.avoidElements.includes(b));
        return hasFav && noAvoid;
      },
      relaxed: true,
    },
    // ③ Pathological: non-avoid + gender relaxed.
    {
      vctx: { ...base, allowGenderLean: true },
      elementFilter: (a, b) =>
        !(a && ctx.avoidElements.includes(a)) &&
        !(b && ctx.avoidElements.includes(b)),
      relaxed: true,
    },
  ];

  for (const pass of twoCharPasses) {
    if (out.length >= needed) break;
    for (const line of ctx.pool) {
      if (out.length >= needed) break;
      const pairs = twoCharPairsFromLine(
        line.chunkText,
        surnameChar,
        pass.vctx,
        pass.elementFilter
      );
      for (const [a, b, span] of pairs) {
        if (out.length >= needed) break;
        // Skip if either individual char has already been used in a prior candidate.
        if (usedChars.has(a) || usedChars.has(b)) continue;

        const candidate: ComposerCandidate = {
          lineId: line.chunkId,
          charSpan: span,
          surnameChar,
          givenChars: [a, b],
          meanings: {
            [a]: `${elementOfChar(a) ?? "classical"} element`,
            [b]: `${elementOfChar(b) ?? "classical"} element`,
          },
          poeticMeaning: `Drawn from ${line.author}'s 《${line.title}》, this name pairs two characters grounded in a real ${line.dynasty}-dynasty line.`,
          masterComment: `A grounded 2-character name from a verified ${line.dynasty}-dynasty line.${
            pass.relaxed ? relaxedNote : ""
          }${fallbackNote}`,
          rescueNote:
            `${pass.relaxed ? relaxedNote : ""}${fallbackNote}`.trim() || undefined,
        };

        if (verifyCandidate(candidate, pass.vctx).ok) {
          usedChars.add(a);
          usedChars.add(b);
          out.push(candidate);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Tier B — Single-char given names (last resort)
  // -------------------------------------------------------------------------
  // usedChars is shared with Tier A — no char used in a 2-char pair appears in a 1-char name.
  const singleCharPasses: Array<{
    vctx: VerifyContext;
    elementOk: (el: string | undefined) => boolean;
    relaxed: boolean;
  }> = [
    // ① favourable element + soft gender ok
    {
      vctx: base,
      elementOk: (el) => !!el && ctx.favourableElements.includes(el),
      relaxed: false,
    },
    // ② favourable element + gender lean relaxed
    {
      vctx: { ...base, allowGenderLean: true },
      elementOk: (el) => !!el && ctx.favourableElements.includes(el),
      relaxed: true,
    },
    // ③ non-avoid + gender lean relaxed
    {
      vctx: { ...base, allowGenderLean: true },
      elementOk: (el) => !!el && !ctx.avoidElements.includes(el),
      relaxed: true,
    },
  ];

  for (const pass of singleCharPasses) {
    if (out.length >= needed) break;
    for (const line of ctx.pool) {
      if (out.length >= needed) break;
      for (const ch of line.chunkText) {
        if (out.length >= needed) break;
        if (usedChars.has(ch) || ch === surnameChar) continue;
        const el = elementOfChar(ch);
        if (!pass.elementOk(el)) continue;
        if (!isNameSuitable(ch)) continue;
        if (isHardBlacklisted(ch)) continue;
        if (ctx.gender && isGenderForbidden(ch, ctx.gender)) continue;

        const candidate: ComposerCandidate = {
          lineId: line.chunkId,
          charSpan: ch,
          surnameChar,
          givenChars: [ch],
          meanings: { [ch]: `${el} element` },
          poeticMeaning: `Drawn from ${line.author}'s 《${line.title}》, this single-character name carries the ${el} essence with quiet classical grace.`,
          masterComment: `A graceful single-character name (姓+1), verifiably grounded in a real ${line.dynasty}-dynasty line.${
            pass.relaxed ? relaxedNote : ""
          }${fallbackNote}`,
          rescueNote:
            `${pass.relaxed ? relaxedNote : ""}${fallbackNote}`.trim() || undefined,
        };
        if (verifyCandidate(candidate, pass.vctx).ok) {
          usedChars.add(ch);
          out.push(candidate);
        }
      }
    }
  }

  return out;
}

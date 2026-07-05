import React from "react";

const PUNCTUATION = new Set(["，", "。", "！", "？", "、", " "]);

/** A single char segment from a poem line. */
export interface PoemSegment {
  char: string;
  highlighted: boolean; // true = one of the given-name characters
  isPunctuation: boolean;
}

/**
 * Parses a poem string (with optional `{char}` brace markers) into an array
 * of segments, each tagged with whether it is a highlighted given-name char.
 *
 * Priority: brace markers (authoritative — exact position in the line) over
 * character-set matching (fallback for archived data without markers).
 * Shared by renderPoem (JSX), PoemCaption (ruby pinyin), and ShareCard.
 */
export function segmentPoem(poem: string, nameHanzi: string): PoemSegment[] {
  if (!poem) return [];

  const hasBraceMarkers = poem.includes("{") && poem.includes("}");
  const givenName = nameHanzi.length > 1 ? nameHanzi.slice(1) : nameHanzi;
  const targetChars = new Set(givenName.replace(/[{}]/g, "").split(""));

  const segments: PoemSegment[] = [];
  let inBrace = false;

  for (const char of poem) {
    if (char === "{") {
      inBrace = true;
      continue;
    }
    if (char === "}") {
      inBrace = false;
      continue;
    }
    const isPunctuation = PUNCTUATION.has(char);
    const highlighted = isPunctuation
      ? false
      : hasBraceMarkers
        ? inBrace
        : targetChars.has(char);
    segments.push({ char, highlighted, isPunctuation });
  }
  return segments;
}

/**
 * Renders a poem with the given name's characters highlighted in seal-red.
 *
 * Preferred: brace-based position markers from hydrate() (exact even when a
 * character appears multiple times in the line). Falls back to character-set
 * matching for pre-marker archived data.
 */
export function renderPoem(poem: string, nameHanzi: string) {
  if (!poem) return null;

  const segments = segmentPoem(poem, nameHanzi);

  return segments.map(({ char, highlighted, isPunctuation }, i) => {
    if (isPunctuation) {
      return <span key={i}>{char}</span>;
    }
    if (highlighted) {
      return (
        <span
          key={i}
          className="text-seal font-bold mx-0.5 text-lg font-hanzi"
          lang="zh-Hans"
        >
          {char}
        </span>
      );
    }
    return (
      <span key={i} className="text-ink font-hanzi" lang="zh-Hans">
        {char}
      </span>
    );
  });
}

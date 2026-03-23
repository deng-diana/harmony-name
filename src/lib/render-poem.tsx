import React from "react";

const PUNCTUATION = new Set(["，", "。", "！", "？", "、", " "]);

/**
 * Renders a poem with the given name's characters highlighted.
 * Only highlights characters from the given name (excludes surname).
 */
export function renderPoem(poem: string, nameHanzi: string) {
  if (!poem) return null;

  const cleanPoem = poem.replace(/[{}]/g, "");
  const givenName = nameHanzi.length > 1 ? nameHanzi.slice(1) : nameHanzi;
  const targetChars = new Set(givenName.split(""));

  return cleanPoem.split("").map((char, i) => {
    if (PUNCTUATION.has(char)) {
      return <span key={i}>{char}</span>;
    }

    if (targetChars.has(char)) {
      return (
        <span key={i} className="text-red-700 font-bold mx-0.5 text-lg">
          {char}
        </span>
      );
    }

    return (
      <span key={i} className="text-stone-800">
        {char}
      </span>
    );
  });
}

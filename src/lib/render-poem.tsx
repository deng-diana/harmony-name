import React from "react";

const PUNCTUATION = new Set(["，", "。", "！", "？", "、", " "]);

/**
 * Renders a poem with the given name's characters highlighted.
 *
 * 优先用 hydrate 标好的 `{字}` 大括号定位 —— 这是【最权威的位置标记】,精准到具体一处
 * (诗里同字出现多次时,旧版按 hanzi 集合做全句通配,会把 3 个 "银" 全染红 —— 不准)。
 * 若没有 `{}` 标记(旧数据 / 边角 case),退回按 hanzi 字符做集合匹配的方式,保证总有效果。
 */
export function renderPoem(poem: string, nameHanzi: string) {
  if (!poem) return null;

  const hasBraceMarkers = poem.includes("{") && poem.includes("}");
  const givenName = nameHanzi.length > 1 ? nameHanzi.slice(1) : nameHanzi;
  const targetChars = new Set(givenName.replace(/[{}]/g, "").split(""));

  const out: React.ReactElement[] = [];
  let key = 0;
  let inBrace = false; // 走到 `{` 开始算"高亮区",走到 `}` 关闭

  for (const char of poem) {
    if (char === "{") {
      inBrace = true;
      continue; // 大括号本身不渲染
    }
    if (char === "}") {
      inBrace = false;
      continue;
    }

    if (PUNCTUATION.has(char)) {
      out.push(<span key={key++}>{char}</span>);
      continue;
    }

    // 高亮判据:有 brace 标记则按位置;无标记退回按字符集合
    const highlight = hasBraceMarkers ? inBrace : targetChars.has(char);
    if (highlight) {
      out.push(
        <span key={key++} className="text-red-700 font-bold mx-0.5 text-lg">
          {char}
        </span>
      );
    } else {
      out.push(
        <span key={key++} className="text-stone-800">
          {char}
        </span>
      );
    }
  }
  return out;
}

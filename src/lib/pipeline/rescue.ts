/**
 * Deterministic 兜底 —— 不调 LLM,纯代码从候选池里找"喜用神 + 性别合宜"的单字,
 * 与姓配 2 字名(姓+1)。仅在 LLM 多轮兜底后仍 <3 时启动 —— 保证 always-3。
 * 抽成独立纯模块(不引 retriever/composer 的 API 客户端),便于零成本确定性单测。
 *
 * 分级放宽(graded relaxation):硬不变量始终保留 —— 接地(出自真句)/ 硬黑名单 /
 * 硬性别禁用(雄霸猛…)/ 非忌神五行 / 不与姓同字。仅"软性别倾向"按需逐级放宽,
 * 直到凑够 needed:
 *   ① 喜用神 + 软性别合宜(默认,绝大多数命盘到此为止)
 *   ② 喜用神 + 放宽软性别(名字略偏阳,但仍出自真诗、五行正确;如实在点评中标注)
 *   ③ 病态兜底(几乎不触发):非忌神 + 放宽软性别
 */
import { verifyCandidate, type VerifyContext } from "../verify";
import {
  elementOfChar,
  isGenderForbidden,
  isHardBlacklisted,
} from "../namechars";
import type { ComposerCandidate } from "../agents/composer";

export function rescueDeterministic(
  surnameChar: string,
  ctx: VerifyContext,
  needed: number,
  isFallbackSurname = false
): ComposerCandidate[] {
  if (needed <= 0 || !surnameChar) return [];
  const out: ComposerCandidate[] = [];
  const usedChars = new Set<string>();
  const fallbackNote = isFallbackSurname
    ? " (System-assigned surname; the AI did not converge on a candidate this round.)"
    : "";
  const relaxedNote =
    " (Element-led fallback — the most fitting grounded characters for this rare chart lean slightly yang.)";

  const passes: {
    vctx: VerifyContext;
    elementOk: (el: string | undefined) => boolean;
    relaxed: boolean;
  }[] = [
    // ① 喜用神 + 软性别合宜(默认)
    {
      vctx: ctx,
      elementOk: (el) => !!el && ctx.favourableElements.includes(el),
      relaxed: false,
    },
    // ② 喜用神 + 放宽软性别倾向(仍守硬性别禁用)
    {
      vctx: { ...ctx, allowGenderLean: true },
      elementOk: (el) => !!el && ctx.favourableElements.includes(el),
      relaxed: true,
    },
    // ③ 病态兜底:非忌神 + 放宽软性别(几乎不触发)
    {
      vctx: { ...ctx, allowGenderLean: true },
      elementOk: (el) => !!el && !ctx.avoidElements.includes(el),
      relaxed: true,
    },
  ];

  for (const pass of passes) {
    if (out.length >= needed) break;
    for (const line of ctx.pool) {
      if (out.length >= needed) break;
      for (const ch of line.chunkText) {
        if (out.length >= needed) break;
        if (usedChars.has(ch) || ch === surnameChar) continue;
        const el = elementOfChar(ch);
        if (!pass.elementOk(el)) continue;
        // 硬不变量:黑名单 / 硬性别禁用 —— 任何 pass 都不放宽
        if (isHardBlacklisted(ch)) continue;
        if (ctx.gender && isGenderForbidden(ch, ctx.gender)) continue;

        const candidate: ComposerCandidate = {
          lineId: line.chunkId,
          charSpan: ch,
          surnameChar,
          givenChars: [ch],
          meanings: { [ch]: `${el} element` },
          poeticMeaning: `Drawn from ${line.author}'s 《${line.title}》, this single-character name carries the ${el} essence with quiet classical grace.`,
          masterComment: `A graceful single-character name (姓+1),verifiably grounded in a real ${line.dynasty}-dynasty line.${
            pass.relaxed ? relaxedNote : ""
          }${fallbackNote}`,
        };
        // 用本 pass 的 vctx 校验:放宽 pass 会带 allowGenderLean,让偏阳字通过软性别关;
        // 但接地/黑名单/硬性别禁用/五行/音律仍由 verifyCandidate 把守。
        if (verifyCandidate(candidate, pass.vctx).ok) {
          usedChars.add(ch);
          out.push(candidate);
        }
      }
    }
  }
  return out;
}

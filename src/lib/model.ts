/**
 * 取名/评审用的 Claude 模型 —— 单一真相来源,环境变量可覆盖,贵/便宜一键切换。
 *
 * 默认 Haiku 4.5(便宜:约 $1/$5 每百万 token 输入/输出,约为 Sonnet 的 1/3 成本)。
 * 取名质量比 Sonnet/Opus 略低,但成本友好 —— 适合大量测试与早期推广。
 *
 * 想换回更聪明的模型(质量优先):在环境里设
 *   NAMING_MODEL=claude-sonnet-4-6   (中端,质量/成本平衡)
 *   NAMING_MODEL=claude-opus-4-8     (最强,最贵)
 * 注意:用裸 alias,【不要】加日期后缀(如 -20251001),否则可能 404。
 *
 * (旧值 claude-sonnet-4-20250514 是即将退役的 Sonnet 4,已弃用。)
 */
export const NAMING_MODEL = process.env.NAMING_MODEL || "claude-haiku-4-5";

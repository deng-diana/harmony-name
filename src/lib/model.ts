/**
 * 取名/评审用的 Claude 模型 —— 单一真相来源,环境变量可覆盖,贵/便宜一键切换。
 *
 * 默认 Sonnet 4.6(质量/速度/成本的最佳平衡)。实测:取名是【严格结构化】任务
 * (只能用诗里的字、要凑两字名、五行要对),Haiku 常一轮凑不齐 3 个合格名 → 反复重试
 * + 拓宽搜索 → 又慢、偶尔掉到平淡兜底单字;而重试 3-4 次又把 Haiku 的单价优势吃掉,
 * 故 Haiku 在此【不划算】。Sonnet 4.6 通常一轮出 3 个好名,又快又稳。
 *
 * 想省钱(单价更低,但本任务慢且不稳):NAMING_MODEL=claude-haiku-4-5
 * 想要最强(最贵,本任务过度投入):NAMING_MODEL=claude-opus-4-8
 * 注意:用裸 alias,【不要】加日期后缀(如 -20251114),否则可能 404。
 *
 * (旧值 claude-sonnet-4-20250514 是即将退役的 Sonnet 4,已弃用。)
 */
export const NAMING_MODEL = process.env.NAMING_MODEL || "claude-sonnet-4-6";

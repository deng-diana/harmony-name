import OpenAI from "openai";

/**
 * OpenAI 客户端 —— 懒加载单例 (lazy singleton)。
 *
 * 为什么不在模块顶层 `new OpenAI()`?
 *   顶层 new 会在 `next build` 的 "Collecting page data" 阶段(加载 route 模块时)就执行。
 *   如果该环境没配 OPENAI_API_KEY,SDK 会抛 "Missing credentials" → 整个【构建】失败。
 *   (典型坑:Vercel 的 Preview 环境没配 key → 每个 PR 的预览部署构建都挂。)
 *
 * 改为首次真正调用时才创建:
 *   - 构建不再依赖密钥,任何环境都能 build 通过;
 *   - 缺 key 只会在那一次请求里抛错 → 由 /api/generate 捕获并退还积分,而非整站崩。
 */
let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI({ apiKey });
  }
  return client;
}

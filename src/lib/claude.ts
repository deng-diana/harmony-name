/**
 * Anthropic Claude 客户端 —— 懒加载单例 (lazy singleton)。
 *
 * 用于取名生成 (Claude Sonnet 4)。向量化仍用 OpenAI (见 openai.ts),
 * 因为 Anthropic 没有 Embedding 模型。
 *
 * 为什么懒加载? 见 openai.ts 顶部注释 —— 顶层 `new Anthropic()` 会在 `next build`
 * 加载 route 模块时执行,缺 CLAUDE_API_KEY 会让构建失败(而不是只让单次请求失败)。
 * 推迟到首次调用才创建,构建就永远不依赖密钥。
 *
 * 注意: 环境变量名是 CLAUDE_API_KEY,【不是】 ANTHROPIC_API_KEY。
 */
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!client) {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) throw new Error("CLAUDE_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Anthropic Claude 客户端 (服务端用)
 *
 * 用于取名生成 — 替代 GPT-4o-mini
 * Claude 对中文古典文化、诗词意象的理解更深
 *
 * 注意: OpenAI 客户端 (openai.ts) 仍然保留
 *       因为 Anthropic 没有 Embedding 模型，向量化仍用 OpenAI
 *
 * 架构:
 *   取名生成: Claude Sonnet 4  ← 这个文件
 *   诗词向量: OpenAI Embedding ← openai.ts
 */
import Anthropic from "@anthropic-ai/sdk";

export const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

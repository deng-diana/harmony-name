/**
 * 诗词检索器 (Retriever) — RAG 的 "R"
 * =====================================
 *
 * 旧版: 从 3.9MB JSON 文件中暴力搜索 130 首诗
 * 新版: 向 Supabase pgvector 发 RPC 请求，在 11,555 条诗句中用 HNSW 索引搜索
 *
 * 流程:
 *   1. 用户的五行查询 (如 "水 木 春天 润泽") → OpenAI Embedding → 1536维向量
 *   2. 向量发给 Supabase → search_poem_chunks 函数 → HNSW 索引快速找到最相似的诗句
 *   3. 返回 top-K 诗句 + 元数据 (标题、作者、朝代)
 */

import { openai } from "./openai";
import { supabase } from "./supabase";

// ============================================================
// 类型定义
// ============================================================

/** 搜索结果: 一条诗句 + 相似度分数 + 经典度 */
export interface ScoredPoem {
  chunkText: string;    // 诗句/联 (如 "春眠不觉晓，处处闻啼鸟。")
  title: string;        // 所属诗词标题
  author: string;       // 作者
  dynasty: string;      // 朝代
  source: string;       // 来源选本 (唐诗三百首/宋词三百首/诗经...)
  fullContent: string;  // 完整诗词内容
  fameScore: number;    // 经典度 (3=名篇, 2=名家, 1=一般)
  similarity: number;   // 加权相似度 (70%语义 + 30%经典度)
}

// ============================================================
// 核心搜索函数
// ============================================================

/**
 * 搜索最相关的诗句
 *
 * @param query - 搜索查询 (如 "象征坚韧、智慧的古典诗词意象")
 * @param topK  - 返回前几条结果 (默认 10)
 * @returns     - 按相似度排序的诗句列表
 *
 * 内部流程:
 *   query (文本)
 *     → OpenAI Embedding API → queryVector (1536维数组)
 *       → Supabase RPC (search_poem_chunks) → 数据库内用 HNSW 索引搜索
 *         → 返回最相似的诗句
 */
export async function searchPoems(
  query: string,
  topK: number = 10
): Promise<ScoredPoem[]> {
  // Step 1: 把查询文本变成向量
  // "水 木 春天 润泽" → [0.012, -0.034, 0.056, ...] (1536个浮点数)
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
    encoding_format: "float",
  });
  const queryVector = embeddingResponse.data[0].embedding;

  // Step 2: 调用 Supabase RPC — 向量搜索
  //
  // 这一行等价于:
  //   SELECT chunk_text, poem_title, poem_author, dynasty, full_content,
  //          1 - (embedding <=> query_vector) AS similarity
  //   FROM poem_chunks JOIN poems ON ...
  //   WHERE similarity > 0.25
  //   ORDER BY embedding <=> query_vector
  //   LIMIT 10
  //
  // 但我们不需要手写 SQL，Supabase 的 rpc() 帮我们调用之前定义的函数
  const { data, error } = await supabase.rpc("search_poem_chunks", {
    query_embedding: JSON.stringify(queryVector),
    match_threshold: 0.25,   // 相似度低于 0.25 的不要 (太不相关)
    match_count: topK,
  });

  if (error) {
    console.error("诗词检索失败:", error.message);
    return [];
  }

  // Step 3: 格式化返回结果
  return (data || []).map((row: Record<string, unknown>) => ({
    chunkText: row.chunk_text as string,
    title: row.poem_title as string,
    author: row.poem_author as string,
    dynasty: row.dynasty as string,
    source: row.source as string,
    fullContent: row.full_content as string,
    fameScore: row.fame_score as number,
    similarity: row.similarity as number,
  }));
}

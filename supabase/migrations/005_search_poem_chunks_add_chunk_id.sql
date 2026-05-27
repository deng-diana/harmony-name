-- ============================================================
-- 005: search_poem_chunks 返回 chunk_id
-- ============================================================
-- 背景(命名管线 v2 的地基):
--   新架构要"按行号(chunk_id)从数据库回填诗词出处",让 LLM 只引用编号、
--   碰不到诗句原文 → 出处零造假。但现有 RPC 不返回 chunk_id,故在此补上。
--
--   改返回列 = 改函数签名,Postgres 不允许 CREATE OR REPLACE,需先 DROP。
--   除新增首列 chunk_id 外,函数体与 add-fame-score.sql 完全一致(0.7 语义 + 0.3 经典度)。
--
-- 执行: 复制到 Supabase SQL Editor → Run
-- ============================================================

DROP FUNCTION IF EXISTS search_poem_chunks(text, float, int);

CREATE FUNCTION search_poem_chunks(
  query_embedding text,
  match_threshold float DEFAULT 0.25,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  chunk_id bigint,
  chunk_text text,
  poem_title text,
  poem_author text,
  dynasty text,
  full_content text,
  source text,
  fame_score smallint,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id AS chunk_id,
    pc.chunk_text,
    p.title AS poem_title,
    p.author AS poem_author,
    p.dynasty,
    p.full_content,
    p.source,
    p.fame_score,
    (
      (1 - (pc.embedding <=> query_embedding::vector)) * 0.7
      + (p.fame_score::float / 3.0) * 0.3
    ) AS similarity
  FROM poem_chunks pc
  JOIN poems p ON p.id = pc.poem_id
  WHERE 1 - (pc.embedding <=> query_embedding::vector) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 验证:应返回带 chunk_id 的若干行(随便给个全 0 向量也能跑通函数结构)
-- SELECT chunk_id, poem_title, poem_author FROM search_poem_chunks(
--   (SELECT '[' || string_agg('0', ',') || ']' FROM generate_series(1,1536)), 0.0, 3
-- );

-- ============================================================
-- 008: 调低 fame_score 权重 (0.3 → 0.2),语义相关性更主导
-- ============================================================
-- 背景:
--   search_poem_chunks 的排序分 = 0.7*语义相似度 + 0.3*经典度(fame_score)。
--   但 fame_score 是【诗级】的(整首诗共享),不是【句级】的 —— 一首名篇里语义只
--   中等相关的联,会靠 0.3 的经典加成挤掉一首二线诗里语义高度相关的好句。对"按意
--   象找句"而言 0.3 偏高,削弱了意境匹配。降到 0.2,让语义(意象)更主导。
--
--   这是 005 版 search_poem_chunks(text 签名、返回 chunk_id)的【唯一】改动:权重
--   0.7/0.3 → 0.8/0.2。函数体其余与 005 完全一致。改返回前需 DROP(签名不变也保险)。
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
      (1 - (pc.embedding <=> query_embedding::vector)) * 0.8
      + (p.fame_score::float / 3.0) * 0.2
    ) AS similarity
  FROM poem_chunks pc
  JOIN poems p ON p.id = pc.poem_id
  WHERE 1 - (pc.embedding <=> query_embedding::vector) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 验证:应返回带 chunk_id 的若干行,排序更偏语义相关
-- SELECT chunk_id, poem_author FROM search_poem_chunks(
--   (SELECT '[' || string_agg('0', ',') || ']' FROM generate_series(1,1536)), 0.0, 3
-- );

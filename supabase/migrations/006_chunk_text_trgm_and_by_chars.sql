-- ============================================================
-- 006: 按"候选字"检索真实诗句 (character-anchored retrieval)
-- ============================================================
-- 背景:
--   语义检索(search_poem_chunks)只保证"意象相关",不保证返回的诗句里
--   真的含有我们想用的喜用神候选字。新架构需要"按字捞真句":给定一组候选字,
--   返回真实含这些字的名句,供取名先生从中选字组名 → 名字必出自真诗。
--
--   pg_trgm 的 GIN 索引让 chunk_text LIKE '%字%' 走索引、快。
--
-- 执行: 复制到 Supabase SQL Editor → Run
-- ============================================================

-- 1) 三元组扩展 + GIN 索引(加速子串/LIKE 匹配)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_poem_chunks_chunk_text_trgm
  ON poem_chunks USING gin (chunk_text gin_trgm_ops);

-- 2) 按候选字检索:返回含【任一】候选字的真实诗句,
--    coverage = 该句命中了几个候选字(命中越多越优先),再按经典度排序。
CREATE OR REPLACE FUNCTION search_lines_by_chars(
  chars text[],
  match_count int DEFAULT 20
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
  coverage int
)
LANGUAGE sql
STABLE
AS $$
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
      SELECT count(*)::int
      FROM unnest(chars) AS c
      WHERE pc.chunk_text LIKE '%' || c || '%'
    ) AS coverage
  FROM poem_chunks pc
  JOIN poems p ON p.id = pc.poem_id
  WHERE EXISTS (
    SELECT 1 FROM unnest(chars) AS c
    WHERE pc.chunk_text LIKE '%' || c || '%'
  )
  ORDER BY coverage DESC, p.fame_score DESC
  LIMIT match_count;
$$;

-- 验证:含 泽/清/明 的名句,经典优先
-- SELECT chunk_id, coverage, fame_score, poem_author, chunk_text
-- FROM search_lines_by_chars(ARRAY['泽','清','明'], 10);
